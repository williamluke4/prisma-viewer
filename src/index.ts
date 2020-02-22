/*globals _:false */
'use strict';



import { DMMF } from '@prisma/generator-helper';
import ace from './ace/ace.js';
require('./ace/mode-prisma.js');
require('./ace/theme-twilight.js');
import { Canvas } from "./canvas";

// import datamodel from '../public/datamodel.json';


window.addEventListener("load", async function() {
    // Your code to run since DOM is loaded and ready
    const datamodel = await (await fetch('./public/datamodel.json')).json()
    let canvas = new Canvas("canvas", datamodel as DMMF.Datamodel)
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/twilight");
    var PrismaMode = ace.require("ace/mode/prisma").Mode;
    editor.session.setMode(new PrismaMode());
}, false);