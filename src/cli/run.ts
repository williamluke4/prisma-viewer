

import { getDMMF } from '@prisma/sdk';
import * as fs from 'fs';
// import chalk from 'chalk';
import chalk from 'chalk';
import { Command } from './helpers/types';
import * as path from 'path';
const Bundler = require('parcel-bundler');
const app = require('express')();

export class Run implements Command {
  static new(): Run {
    return new Run()
  }
  private constructor() {}
  async parse(args: string[]) {
    const datamodelPath = args && args[0]
    const dmmf = await getDMMF({datamodelPath})
    fs.writeFileSync(path.join(__dirname, '../../public/datamodel.json'), JSON.stringify(dmmf.datamodel), {encoding: 'utf8', flag: 'w' })
    console.log(chalk.green('Data Model Generated'));
    const file = path.join(__dirname, '../../../public/index.html'); // Pass an absolute path to the entrypoint here
    console.log(file);


    const options = {}; // See options section of api docs, for the possibilities

    // Initialize a new bundler using a file and options
    const bundler = new Bundler(file, options);

    // Let express use the bundler middleware, this will let Parcel handle every request over your express server
    app.use(bundler.middleware());

    // Listen on port 8080
    app.listen(8080);
    return ''
  }
}


