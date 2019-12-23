import { getDMMF } from '@prisma/sdk';
import * as fs from 'fs';

const filepath = './tests/schema.prisma'
async function parse(){
  const dmmf = await getDMMF({datamodelPath: filepath})
  fs.writeFileSync('./tests/datamodel.json', JSON.stringify(dmmf.datamodel), {encoding: 'utf8'})
  console.log(dmmf.datamodel);
}
parse()