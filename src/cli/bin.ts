#!/usr/bin/env node
import { runCli } from './index'

runCli(process.argv).catch((error) => {
  console.error(error)
  process.exit(1)
})