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

package boiler.vroom.client;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.MessageConsumer;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.StaticHandler;
import io.vertx.ext.web.handler.sockjs.BridgeOptions;
import io.vertx.ext.web.handler.sockjs.PermittedOptions;
import io.vertx.ext.web.handler.sockjs.SockJSHandler;

/**
 * @author <a href="https://julien.ponge.org/">Julien Ponge</a>
 */
public class ClientVerticle extends AbstractVerticle {

  private final Logger logger = LoggerFactory.getLogger(ClientVerticle.class);

  @Override
  public void start(Future<Void> startFuture) throws Exception {

    EventBus eventBus = vertx.eventBus();

    Router router = Router.router(vertx);

    StaticHandler staticHandler = StaticHandler.create().setCachingEnabled(false);

    router.get("/assets/*").handler(staticHandler);
    router.get("/").handler(context -> context.reroute("/assets/client.html"));

    SockJSHandler sockJSHandler = SockJSHandler.create(vertx);
    PermittedOptions permittedOptions = new PermittedOptions().setAddressRegex("boilervroom\\..+");
    BridgeOptions bridgeOptions = new BridgeOptions()
      .addInboundPermitted(permittedOptions)
      .addOutboundPermitted(permittedOptions);
    sockJSHandler.bridge(bridgeOptions);

    router.route("/eventbus/*").handler(sockJSHandler);

    eventBus.consumer("boilervroom.fromclients", message -> {
      JsonObject request = (JsonObject) message.body();
      switch (request.getString("type")) {
        case "sequence":
          eventBus.publish("boilervroom.committed", request);
          break;
        case "sequencer-slot-volume":
          eventBus.publish("boilervroom.committed", request);
          break;
        default:
          logger.error("Unknown client request: " + request);
      }
    });

    router.get("/audiostream").handler(context -> {
      logger.info("New streaming client: " + context.request().remoteAddress());
      HttpServerResponse response = context.response();
      response.setStatusCode(200);
      response.setChunked(true);
      response.putHeader("Content-Type", "audio/mpeg");
      MessageConsumer<Buffer> consumer = eventBus.consumer("boilervroom.audiostream");
      consumer.bodyStream().handler(buffer -> {
        if (!response.writeQueueFull()) {
          response.write(buffer);
        }
      });
      response.endHandler(v -> {
        logger.info("Stream client left: " + context.request().remoteAddress());
        consumer.unregister();
      });
      response.exceptionHandler(t -> {
        logger.info("Stream client left with error: " + context.request().remoteAddress(), t);
        consumer.unregister();
      });
    });

    vertx.createHttpServer()
      .requestHandler(router::accept)
      .listen(8080, ar -> {
        if (ar.succeeded()) {
          logger.info("Started a client HTTP server");
          startFuture.complete();
        } else {
          logger.error("Failed to start a client HTTP server", ar.cause());
          startFuture.fail(ar.cause());
        }
      });
  }
}
