
// import chalk from 'chalk';
import chalk from 'chalk';
import { Command } from './helpers/types';
import * as path from 'path';
// const cmd = `du -h --max-depth=1`


export class Run implements Command {
  static new(): Run {
    return new Run()
  }
  private constructor() {}
  async parse(args: string[], depth: number = 1) {
    const path = args && args[0]
    const stdout = this.run(path)
    return stdout
  }
  async run(path = 'schema.prisma') {
    const datamodel = await parse(path)
    return ''
  }

}

import { getDMMF } from '@prisma/sdk';
import * as fs from 'fs';

// const filepath = './tests/schema.prisma'
async function parse(path: string){
  const dmmf = await getDMMF({datamodelPath: path})
  fs.writeFileSync('./tests/datamodel.json', JSON.stringify(dmmf.datamodel), {encoding: 'utf8'})
  return dmmf.datamodel
}
