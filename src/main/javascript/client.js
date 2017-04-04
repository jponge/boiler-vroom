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

  const filterButton1 = document.getElementById("filter-button-1")
  const filterButton2 = document.getElementById("filter-button-2")
  function filterButtonHandlerMaker(number) {
    return (e) => {
      eventBus.publish("boilervroom.fromclients", {
        type: "filter-button",
        value: number
      })
    }
  }
  filterButton1.addEventListener("click", filterButtonHandlerMaker(1))
  filterButton1.addEventListener("touchend", (e) => {})
  filterButton2.addEventListener("click", filterButtonHandlerMaker(2))
  filterButton2.addEventListener("touchend", (e) => {})

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
      case "filter-button":
        break
      case "filter-button-update":
        changeFilterButtonStatus(message.body.value, message.body.state)
        break
      case "filter-range":
        break
      case "play":
        updatePlayButton(message.body.target, message.body.value)
        break
      default:
        console.log("Unknown decision: ")
        console.dir(message.body)
    }
  })

  function updatePlayButton(targetId, value) {
    const button = document.getElementById(targetId)
    if (value) {
      button.classList.add("btn-primary")
      button.classList.add("active")
      button.classList.remove("btn-default")
    } else {
      button.classList.remove("btn-primary")
      button.classList.remove("active")
      button.classList.add("btn-default")
    }
  }

  function changeFilterButtonStatus(number, state) {
    var button = (number === 1) ? filterButton1 : filterButton2
    if (state) {
      button.classList.add("btn-primary")
      button.classList.add("active")
      button.classList.remove("btn-default")
    } else {
      button.classList.remove("btn-primary")
      button.classList.remove("active")
      button.classList.add("btn-default")
    }
  }

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

  function changeFilterSlider(n, value) {
    document.getElementById(`filter-range-${n}`).value = value
  }

  for (let n = 1; n <= 2; n++) {
    const slider = document.getElementById(`filter-range-${n}`)
    slider.addEventListener("change", (e) => {
      eventBus.publish("boilervroom.fromclients", {
        type: "filter-range",
        number: n,
        value: parseInt(slider.value)
      })
    })
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
      case "filter":
        changeFilterButtonStatus(message.body.number, message.body.value)
        break
      case "filter-range":
        changeFilterSlider(message.body.number, message.body.value)
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
      likeButton.classList.toggle("invisible")
      dislikeButton.classList.toggle("invisible")
      setTimeout(() => {
        likeButton.classList.toggle("invisible")
        dislikeButton.classList.toggle("invisible")
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
