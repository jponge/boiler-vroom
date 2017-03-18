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

package boiler.vroom.booth;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
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
public class DjBoothVerticle extends AbstractVerticle {

  private final Logger logger = LoggerFactory.getLogger(DjBoothVerticle.class);

  @Override
  public void start(Future<Void> startFuture) throws Exception {

    Router router = Router.router(vertx);

    StaticHandler staticHandler = StaticHandler.create().setCachingEnabled(false);

    router.get("/assets/*").handler(staticHandler);
    router.get("/").handler(context -> context.reroute("/assets/dj-booth.html"));

    SockJSHandler sockJSHandler = SockJSHandler.create(vertx);
    PermittedOptions permittedOptions = new PermittedOptions().setAddress("traktor\\..+");
    BridgeOptions bridgeOptions = new BridgeOptions()
      .addInboundPermitted(permittedOptions)
      .addOutboundPermitted(permittedOptions);
    sockJSHandler.bridge(bridgeOptions);

    router.route("/eventbus/*").handler(sockJSHandler);

    vertx.createHttpServer()
      .requestHandler(router::accept)
      .listen(6913, ar -> {
        if (ar.succeeded()) {
          logger.info("Dj Booth HTTP server running");
          startFuture.complete();
        } else {
          logger.error("Dj Booth HTTP failed to start", ar.cause());
          startFuture.fail(ar.cause());
        }
      });
  }
}
