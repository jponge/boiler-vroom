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
import FontAwesome from 'font-awesome/css/font-awesome.min.css'
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
    const tapHandler = (e) => {
      changeActiveSeqButton(n)
      eventBus.publish("boilervroom.fromclients", {
        type: 'sequence',
        value: n
      })
    }
    const button = document.getElementById(`seq-${n}`)
    button.addEventListener("touchstart", tapHandler)
    button.addEventListener("click", tapHandler)
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
      case "sequencer-slot-volume":
        break
      case "mixer-control":
        changeMixerControl(message.body.id, message.body.value)
        break
      case "like-update":
        changeLikeCount(message.body.value)
        break
      default:
        console.log("Unknown decision: " + message.body)
    }
  })

  function changeLikeCount(value) {
    document.getElementById("likes-counter").innerHTML = `${value}`
  }

  eventBus.send("boilervroom.fromclients", {type: "like-get"})

  function changeSequencerSlotVolume(slot, value) {
    document.getElementById(`vol-seq-${slot}`).value = value
  }

  function changeMixerControl(id, value) {
    document.getElementById(id).value = value
  }

  eventBus.registerHandler("boilervroom.fromtraktor", (err, message) => {
    if (err) {
      console.log(err)
      return
    }
    switch (message.body.type) {
      case "sequencer-slot-volume":
        changeSequencerSlotVolume(message.body.slot, message.body.value)
        break
      default:
        console.log("Unknow actiom from Traktor: " + message.body)
    }
  })

  for (let n = 1; n <=4; n++) {
    const slider = document.getElementById(`vol-seq-${n}`)
    slider.addEventListener("change", (event) => {
      eventBus.publish("boilervroom.fromclients", {
        type: "sequencer-slot-volume",
        slot: n,
        value: parseInt(slider.value)
      })
    })
  }

  const likeButton = document.getElementById("like-button");
  const dislikeButton = document.getElementById("dislike-button");
  function likeHandlerMaker(incr) {
    return (event) => {
      eventBus.publish("boilervroom.fromclients", {
        type: "like",
        value: incr
      })
      likeButton.classList.toggle("disabled")
      dislikeButton.classList.toggle("disabled")
      setTimeout(() => {
        likeButton.classList.toggle("disabled")
        dislikeButton.classList.toggle("disabled")
      }, 5000)
    }
  }
  likeButton.addEventListener("click", likeHandlerMaker(1))
  dislikeButton.addEventListener("click", likeHandlerMaker(-1))
}

document.addEventListener('DOMContentLoaded', () => {
  const eventBus = new EventBus("/eventbus")
  eventBus.onopen = () => {
    main(eventBus)
  }
})
