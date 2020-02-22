/*globals _:false */
'use strict';

import _ from 'lodash';
import { World } from "./world";
import { DMMF } from '@prisma/generator-helper';

// import datamodel from '../public/datamodel.json';


document.addEventListener("DOMContentLoaded", async function() {
    // Your code to run since DOM is loaded and ready
    const datamodel = await (await fetch('./public/datamodel.json')).json()

    let world = new World("canvas", datamodel as DMMF.Datamodel)
});