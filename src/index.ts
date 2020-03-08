/*globals _:false */
'use strict';



import { DMMF } from '@prisma/generator-helper';
import ace from './ace/ace.js';
import { Canvas } from "./canvas";
require('./ace/mode-prisma.js');
require('./ace/theme-twilight.js');

// import datamodel from '../public/datamodel.json';


window.addEventListener("load", async function() {
    // Your code to run since DOM is loaded and ready
    let generateButton = document.getElementById('generate')
   
    
    const schema = await (await fetch('/public/schema.prisma')).text()
    const dmmf = await (await fetch('/generate', {method: "POST", body: schema, })).json()
    let canvas = new Canvas("canvas", dmmf.datamodel as DMMF.Datamodel)
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/twilight");
    editor.setValue(schema)
    var PrismaMode = ace.require("ace/mode/prisma").Mode;
    editor.session.setMode(new PrismaMode());
    generateButton && generateButton.addEventListener('click', async () => {
        const dmmf = await (await fetch('/generate', {method: "POST", body: editor.getValue(), })).json()
        canvas.updateDatamodel(dmmf.datamodel)
    })
}, false);