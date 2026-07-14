type CliCoreModule = typeof import('./core')
type DoctorModule = typeof import('./commands/doctor')

let corePromise: Promise<CliCoreModule> | undefined
let doctorPromise: Promise<DoctorModule> | undefined

export async function loadCliCore(): Promise<CliCoreModule> {
  corePromise ||= import('./core')
  return corePromise
}

export async function loadDoctorCommand(): Promise<DoctorModule> {
  doctorPromise ||= import('./commands/doctor')
  return doctorPromise
}
