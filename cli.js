#!/usr/bin/env node
'use strict'

// this is hilariously overengineered
const fs = require('fs')
const path = require('path')
const recursive = require('recursive-readdir')
const meow = require('meow')
const crypto = require('crypto')

// using regex to check validity isn't ideal but it's quick and easy
const ALPHANUMERIC_REGEX = /^\w+$/
const META_COMMENT = 'Exported for https://atlasbot.xyz via https://github.com/atlasbot/action-decryptor'
const ENC_ALGORITHM = 'aes-256-ecb'
// this password has always been public. including it here is fine.
const ENC_PASS = '9kkR8Ge4*ndUde15@Yebn#SxwVF#aGemcSYGC8e6'

const cli = meow(`
    Usage: action-decryptor [path]

    Examples
      action-decryptor .
      action-decryptor E:\\\\community-actions
      action-decryptor E:\\\\community-actions\\\\Fun\\\\JaM-Sudo\\\\Sudo-Keyword.action
`)

const fsRoot = path.parse(process.cwd()).root
const target = cli.input.join(' ')
if (!target) return cli.showHelp()
const targetPath = path.resolve(target)

if (!targetPath) {
  throw new Error('Could not resolve target path.')
}

if (targetPath === fsRoot) {
  throw new Error('Cannot run on root drive. Did you mean to enter a different path?')
}

async function main() {
  let files = []
  if (targetPath.endsWith('.action')) files.push(targetPath)
  else files = (await recursive(targetPath)).filter(p => !p.includes('.git') && p.endsWith('.action'))

  for (let file of files) {
    // for files this small, streaming is practically useless
    const content = fs.readFileSync(file).toString()
    if (!ALPHANUMERIC_REGEX.test(content)) {
      console.log(`Skipping "${file}"`)
      continue
    }

    const buffer = Buffer.from(content, 'hex')
    const decipher = crypto.createDecipher(ENC_ALGORITHM, ENC_PASS)
    decipher.write(buffer)
    decipher.end()
    const asString = decipher.read().toString('utf8')
    const json = JSON.parse(JSON.parse(asString))
    const toWrite = JSON.stringify({ meta: META_COMMENT, ...json, formatVersion: '1.2' }, null, 2) + '\n'
    fs.writeFileSync(file, toWrite, null, 2)
    console.log(`Updated "${file}"`)
  }
}

main()
