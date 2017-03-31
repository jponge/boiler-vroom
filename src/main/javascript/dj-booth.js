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

const seq1 = [
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
]

const seq2 = [
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1", "D1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1"], 1],
  null,
  null,
  null,
  // ---- //
  [["C1", "D1"], 1],
  null,
  null,
  [["D1"], 1],
]

const seq3 = [
  // ---- //
  [["C1"], 1],
  null,
  [["E1"], 1],
  null,
  // ---- //
  [["C1", "D1"], 1],
  null,
  [["E1"], 1],
  null,
  // ---- //
  [["C1"], 1],
  null,
  [["E1"], 1],
  null,
  // ---- //
  [["C1", "D1"], 1],
  null,
  [["E1"], 1],
  [["D1"], 1],
]

const seq4 = [
  // ---- //
  [["C1"], 1],
  null,
  [["E1"], 1],
  null,
  // ---- //
  [["C1", "D1"], 1],
  null,
  [["E1"], 1],
  [["F1"], 1],
  // ---- //
  [["C1"], 1],
  null,
  [["E1", "F1"], 1],
  [["E1"], 1],
  // ---- //
  [["C1", "D1", "F1"], 1],
  [["F1"], 1],
  [["E1", "D1"], 1],
  [["D1", "E1"], 1],
]

const patterns = [seq1, seq2, seq3, seq4]

document.addEventListener('DOMContentLoaded', () => {

  const midiAlertDisplay = document.getElementById("midi-alert");
  midiSequencer.whenMidiReady(() => {
    midiAlertDisplay.classList.add("btn-success")
    midiAlertDisplay.classList.remove("btn-danger")

    const traktorIn = midiSequencer.inputPort(port => port.name.includes("Traktor Virtual"))
    const traktorOut = midiSequencer.outputPort(port => port.name.includes("Traktor Virtual"))

    const stepsPerBeat = 4
    const stepsPerPattern = 4
    const sequencer = new midiSequencer.Sequencer(traktorIn, traktorOut, stepsPerBeat, stepsPerPattern, seq1)

    sequencer.addListener(event => {
    })

    const eventBus = new EventBus("/eventbus")
    const serverAlertDisplay = document.getElementById("server-alert")

    eventBus.onopen = () => {
      serverAlertDisplay.classList.remove("btn-danger")
      serverAlertDisplay.classList.add("btn-success")

      const volumeNoteSlots = {
        "C": 1,
        "D": 2,
        "E": 3,
        "F": 4
      }
      traktorIn.addListener("noteon", 1, (event) => {
        if (event.note.octave == -2) {
          eventBus.publish("boilervroom.fromtraktor", {
            type: "sequencer-slot-volume",
            slot: volumeNoteSlots[event.note.name],
            value: event.rawVelocity
          })
        }
      })

      const mixerControlsForCode = [
        "deck1-eq-low",
        "deck1-eq-mid",
        "deck1-eq-high",
        "deck1-volume",
        "deck2-eq-low",
        "deck2-eq-mid",
        "deck2-eq-high",
        "deck2-volume"
      ]
      traktorIn.addListener("controlchange", 2, (event) => {
        eventBus.publish("boilervroom.committed", {
          type: "mixer-control",
          id: mixerControlsForCode[event.controller.number],
          value: event.value
        })
      })

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

      const transcodingButton = document.getElementById("start-transcoding")
      transcodingButton.addEventListener("click", (e) => {
        eventBus.publish("boilervroom.transcoding", {
          action: "start"
        })
        transcodingButton.classList.add("disabled")
        transcodingButton.classList.add("btn-default")
        transcodingButton.classList.remove("btn-primary")
        transcodingButton.innerHTML = "(VLC started)"
      })

      var fxStatus = {
        "filter-button-1": false,
        "filter-button-2": false,
      }

      const filterButtonNote = []
      filterButtonNote[1] = "C1"
      filterButtonNote[2] = "D1"

      const filterSliderNote = []
      filterSliderNote[1] = "C2"
      filterSliderNote[2] = "D2"

      traktorIn.addListener("controlchange", 3, (event) => {
        switch (event.controller.number) {
          case 0:
            eventBus.publish("boilervroom.fromtraktor", {
              type: "filter",
              number: 1,
              value: (event.value !== 0)
            })
            break
          case 1:
            eventBus.publish("boilervroom.fromtraktor", {
              type: "filter",
              number: 2,
              value: (event.value !== 0)
            })
            break
          case 4:
            eventBus.publish("boilervroom.fromtraktor", {
              type: "filter-range",
              number: 1,
              value: (event.value)
            })
            break
          case 5:
            eventBus.publish("boilervroom.fromtraktor", {
              type: "filter-range",
              number: 2,
              value: (event.value)
            })
            break
          default:
            console.log("Unhandled CC:")
            console.dir(event)
        }
      })

      eventBus.registerHandler("boilervroom.committed", (err, message) => {
        if (err) {
          console.log(err)
          return
        }
        switch (message.body.type) {
          case "sequence":
            sequencer.use(patterns[message.body.value - 1])
            break
          case "sequencer-slot-volume":
            traktorOut.sendControlChange(message.body.slot - 1, message.body.value, 1)
            break
          case "mixer-control":
            break
          case "like-update":
            break
          case "filter-button":
            const n = message.body.value;
            const slot = `filter-button-${n}`
            fxStatus[slot] = !fxStatus[slot]
            if (fxStatus[slot]) {
              traktorOut.playNote(filterButtonNote[n], 3)
            } else {
              traktorOut.stopNote(filterButtonNote[n], 3)
            }
            eventBus.publish("boilervroom.committed", {
              type: "filter-button-update",
              value: message.body.value,
              state: fxStatus[slot]
            })
            break
          case "filter-button-update":
            break
          case "filter-range":
            traktorOut.sendControlChange(message.body.number + 1, message.body.value, 3)
            break
          default:
            console.log("Unknown decision: ")
            console.dir(message.body)
        }
      })
    }

    eventBus.onclose = () => {
      serverAlertDisplay.classList.add("btn-danger")
      serverAlertDisplay.classList.remove("btn-success")
    }
  }, err => {
    midiAlertDisplay.classList.add("btn-danger")
  })
})

