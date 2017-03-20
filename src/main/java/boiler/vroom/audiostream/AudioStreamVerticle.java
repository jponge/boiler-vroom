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

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.MessageProducer;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.core.net.NetSocket;

/**
 * @author <a href="https://julien.ponge.org/">Julien Ponge</a>
 */
public class AudioStreamVerticle extends AbstractVerticle {

  private final Logger logger = LoggerFactory.getLogger(AudioStreamVerticle.class);

  private static final String ANNOUNCE_DESTINATION = "boilervroom.audiosource";
  private static final JsonObject CONNECTED_MESSAGE = new JsonObject().put("connected", true);
  private static final JsonObject DISCONNECTED_MESSAGE = new JsonObject().put("connected", false);

  private boolean inUse = false;

  @Override
  public void start(Future<Void> startFuture) throws Exception {

    EventBus eventBus = vertx.eventBus();

    vertx.createHttpServer()
      .requestHandler((HttpServerRequest request) -> {
        if (inUse) {
          logger.error("Already connected to an audio source");
          request.response().setStatusCode(409).end();
        } else {
          inUse = true;
          eventBus.publish(ANNOUNCE_DESTINATION, CONNECTED_MESSAGE);
          logger.info("Connected to an audio source");
          MessageProducer<Buffer> publisher = eventBus.publisher("boilervroom.audiostream");
          NetSocket netSocket = request.netSocket();
          netSocket
            .write("HTTP/1.0 200 OK\r\n\r\n")
            .handler(data -> {
              logger.info("data " + data.length() + " " + publisher.writeQueueFull());
              if (!publisher.writeQueueFull()) {
                publisher.write(data);
              }
            })
            .endHandler(v -> {
              inUse = false;
              publisher.close();
              eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
              logger.info("Disconnected from an audio source");
            })
            .exceptionHandler(t -> {
              logger.error(t);
              publisher.close();
              eventBus.publish(ANNOUNCE_DESTINATION, DISCONNECTED_MESSAGE);
            });
        }
      }).listen(8000, ar -> {
      if (ar.succeeded()) {
        logger.info("Audio source server started");
        startFuture.complete();
      } else {
        logger.error(ar.cause());
        startFuture.fail(ar.cause());
      }
    });
  }
}
