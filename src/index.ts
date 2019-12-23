/*globals _:false */
'use strict';

import { Vec } from "./vector";
import _ from 'lodash';
import { Ball } from "./ball";
import { Timer } from "./timer";
import { World } from "./world";
import { DMMF } from '@prisma/generator-helper';

import datamodel from '../tests/datamodel.json';

document.addEventListener("DOMContentLoaded", function() {
    // Your code to run since DOM is loaded and ready
    let world = new World("canvas", datamodel as DMMF.Datamodel)
    console.log(world.models);
});