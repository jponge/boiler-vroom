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
import * as midiSequencer from 'webmidi-sequencer'
import EventBus from 'vertx3-eventbus-client'

document.addEventListener('DOMContentLoaded', () => {

  const midiAlertDisplay = document.getElementById("midi-alert");
  midiSequencer.whenMidiReady(() => {
    midiAlertDisplay.classList.add("btn-success")
    midiAlertDisplay.classList.remove("btn-danger")

    const traktorIn = midiSequencer.inputPort(port => port.name.includes("Traktor Virtual"))
    const traktorOut = midiSequencer.outputPort(port => port.name.includes("Traktor Virtual"))

    const stepsPerBeat = 2
    const stepsPerPattern = 4
    const sequencer = new midiSequencer.Sequencer(traktorIn, traktorOut, stepsPerBeat, stepsPerPattern, [
      [["C1"], 1],
      [["E1"], 1],
      [["C1", "D1", "F1"], 1],
      [["E1", "F1"], 1],
      [["C1"], 1],
      [["E1"], 1],
      [["C1", "D1"], 1],
      [["E1"], 1],
    ])

    sequencer.addListener(event => {
    })

  }, err => {
    midiAlertDisplay.classList.add("btn-danger")
  })

  const eventBus = new EventBus("/eventbus")
  const serverAlertDisplay = document.getElementById("server-alert")

  eventBus.onopen = () => {
    serverAlertDisplay.classList.remove("btn-danger")
    serverAlertDisplay.classList.add("btn-success")

    const sourceAlertDisplay = document.getElementById("source-alert")
    eventBus.registerHandler("boilervroom.audiosource", (err, message) => {
      if (!err && message.body.connected) {
        sourceAlertDisplay.classList.remove("btn-danger")
        sourceAlertDisplay.classList.add("btn-success")
      } else {
        sourceAlertDisplay.classList.add("btn-danger")
        sourceAlertDisplay.classList.remove("btn-success")
      }
    })
  }
  eventBus.onclose = () => {
    serverAlertDisplay.classList.add("btn-danger")
    serverAlertDisplay.classList.remove("btn-success")
  }


})

