/*
 * Copyright (c) 2017 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package boiler.vroom.audiostream;

import com.julienviet.childprocess.Process;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.MessageProducer;
import io.vertx.core.http.HttpClientOptions;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import java.util.Arrays;

import static java.util.Arrays.asList;

/**
 * @author <a href="https://julien.ponge.org/">Julien Ponge</a>
 */
public class AudioStreamVerticle extends AbstractVerticle {

  private final Logger logger = LoggerFactory.getLogger(AudioStreamVerticle.class);

  private static final String ANNOUNCE_DESTINATION = "boilervroom.audiosource";
  private static final JsonObject CONNECTED_MESSAGE = new JsonObject().put("connected", true);
  private static final JsonObject DISCONNECTED_MESSAGE = new JsonObject().put("connected", false);

  private boolean inUse = false;
  private Process icecastProcess;
  private Process vlcProcess;

  @Override
  public void start(Future<Void> startFuture) throws Exception {

    EventBus eventBus = vertx.eventBus();

    Future<Void> icecastFuture = Future.future();
    icecastProcess = Process.create(vertx, "icecast", asList("-c", "etc/icecast.xml"));
    icecastProcess.start(process -> icecastFuture.complete());
    icecastProcess.exitHandler(exitCode -> {
      String message = "icecast exited with status code " + exitCode;
      if (!icecastFuture.isComplete()) {
        icecastFuture.fail(message);
      }
      logger.warn(message);
    });
    icecastProcess.stdout().handler(logger::info);
    icecastProcess.stderr().handler(logger::warn);

    eventBus.consumer("boilervroom.transcoding", message -> {
      JsonObject body = (JsonObject) message.body();
      if ("start".equals(body.getString("action"))) {
        runVLC();
      }
    });

//    vlcProcess = Process.create(vertx, "/Applications/VLC.app/Contents/MacOS/VLC", asList(
//      "http://localhost:8000/stream",
//      "--sout=#transcode{acodec=mp3,ab=128,channels=2,samplerate=44100}:http{dst=:8001/stream.mp3"
//    ));
//    vlcProcess.start(process -> vlcFuture.complete());
//    vlcProcess.exitHandler(exitCode -> {
//      String message = "VLC exited with status code " + exitCode;
//      if (!vlcFuture.isComplete()) {
//        vlcFuture.fail(message);
//      }
//      logger.warn(message);
//    });
//    vlcProcess.stdout().handler(logger::info);
//    vlcProcess.stderr().handler(logger::warn);


//    vertx.createHttpServer()
//      .requestHandler((HttpServerRequest request) -> {
//        if (inUse) {
//          logger.error("Already connected to an audio source");
//          request.response().setStatusCode(409).end();
//        } else {
//          inUse = true;
//          eventBus.publish(ANNOUNCE_DESTINATION, CONNECTED_MESSAGE);
//          logger.info("Connected to an audio source");
//          request.netSocket()
//            .write("HTTP/1.0 200 OK\r\n\r\n")
//            .handler(buffer -> {
//              // TODO
//            }).endHandler(v -> {
//            inUse = false;
//            eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
//            logger.info("Disconnected from an audio source");
//          }).exceptionHandler(t -> {
//            logger.error(t);
//            eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
//          });
//        }
//      }).listen(8000, ar -> {
//      if (ar.succeeded()) {
//        logger.info("Audio source server started");
//        startFuture.complete();
//      } else {
//        logger.error(ar.cause());
//        startFuture.fail(ar.cause());
//      }
//    });
  }

  private void runVLC() {
    EventBus eventBus = vertx.eventBus();

    vlcProcess = Process.create(vertx, "/Applications/VLC.app/Contents/MacOS/VLC", asList(
      "http://localhost:8000/stream",
      "--sout=#transcode{acodec=mp3,ab=96,channels=2,samplerate=44100}:http{dst=:8001/stream.mp3",
      "--playlist-autostart"
    ));

    vlcProcess.exitHandler(exitCode -> logger.warn("VLC exited with status code " + exitCode));
    vlcProcess.stdout().handler(logger::info);
    vlcProcess.stderr().handler(logger::warn);

    vlcProcess.start(process -> {
      vertx.setTimer(3000, n -> {
        HttpClientOptions options = new HttpClientOptions().setDefaultHost("localhost").setDefaultPort(8001);
        vertx.createHttpClient(options)
          .getNow("/stream.mp3", response -> {
            eventBus.publish(ANNOUNCE_DESTINATION, CONNECTED_MESSAGE);
            logger.info("Connected to the VLC transcoder");
            response.handler(buffer -> eventBus.publish("boilervroom.audiostream", buffer));
            response.exceptionHandler(t -> {
              logger.error(t);
              eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
            });
            response.endHandler(v -> {
              logger.warn("Connection closed to the VLC transcoder");
              eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
            });
          });
      });
    });
  }

  @Override
  public void stop() throws Exception {
    if (icecastProcess.isRunning()) {
      icecastProcess.kill(true);
    }
    if (vlcProcess != null && vlcProcess.isRunning()) {
      vlcProcess.kill(true);
    }
  }
}
