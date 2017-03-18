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
import * as sockjs from 'sockjs-client'

midiSequencer.whenMidiReady(() => {

  console.log("MIDI ok")

  let traktorIn = midiSequencer.inputPort(port => port.name.includes("Traktor Virtual"))
  let traktorOut = midiSequencer.outputPort(port => port.name.includes("Traktor Virtual"))

  let sequencer = new midiSequencer.Sequencer(traktorIn, traktorOut, 2, 4, [
    [["C1"], 1],
    [["E1"], 1],
    [["C1", "D1", "F1"], 1],
    [["E1", "F1"], 1],
    [["C1"], 1],
    [["E1"], 1],
    [["C1", "D1"], 1],
    [["E1"], 1],
  ])

}, err => {
  console.log("No MIDI available")
})
