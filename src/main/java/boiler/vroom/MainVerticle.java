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

package boiler.vroom;

import io.vertx.core.*;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import static io.vertx.core.Future.future;

/**
 * @author <a href="https://julien.ponge.org/">Julien Ponge</a>
 */
public class MainVerticle extends AbstractVerticle {

  private final Logger logger = LoggerFactory.getLogger(MainVerticle.class);

  @Override
  public void start(Future<Void> startFuture) throws Exception {

    Future<String> djBoothFuture = future();
    vertx.deployVerticle("boiler.vroom.booth.DjBoothVerticle", djBoothFuture);

    Future<String> audioStreamFuture = future();
    vertx.deployVerticle("boiler.vroom.audiostream.AudioStreamVerticle", audioStreamFuture);

    Future<String> clientFuture = future();
    vertx.deployVerticle("boiler.vroom.client.ClientVerticle",
      new DeploymentOptions().setInstances(2), clientFuture);

    CompositeFuture.all(djBoothFuture, audioStreamFuture, clientFuture).setHandler(ar -> {
      if (ar.succeeded()) {
        logger.info("Boiler Vroom started");
        startFuture.complete();
      } else {
        logger.error("Boiler Vroom failed to start", ar.cause());
      }
    });
  }

  public static void main(String[] args) {
    Launcher.main(new String[]{"run ", "boiler.vroom.MainVerticle"});
  }
}
