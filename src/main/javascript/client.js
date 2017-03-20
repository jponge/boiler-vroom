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

import Bootstrap from 'bootstrap/dist/css/bootstrap.css'
import EventBus from 'vertx3-eventbus-client'

function main(eventBus) {

  const seqs = [1, 2, 3, 4];
  function changeActiveSeqButton(n) {
    const pressedButton = document.getElementById(`seq-${n}`);
    pressedButton.classList.add("btn-primary")
    seqs.forEach((i) => {
      if (i != n) {
        const inactiveButton = document.getElementById(`seq-${i}`);
        inactiveButton.classList.remove("btn-primary")
        inactiveButton.classList.add("btn-default")
        inactiveButton.classList.remove("active")
      }
    })
  }

  seqs.forEach(n => {
    const handler = (e) => {
      changeActiveSeqButton(n)
      eventBus.publish("boilervroom.fromclients", {
        type: 'sequence',
        value: n
      })
    }
    const button = document.getElementById(`seq-${n}`)
    button.addEventListener("touchstart", handler)
    button.addEventListener("click", handler)
  })

  eventBus.registerHandler("boilervroom.committed", (err, message) => {
    if (err) {
      console.log(err)
      return
    }
    switch (message.body.type) {
      case "sequence":
        changeActiveSeqButton(message.body.value)
        break
      default:
        console.log("Unknown decision: " + message.body)
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const eventBus = new EventBus("/eventbus")
  eventBus.onopen = () => {
    main(eventBus)
  }
})
