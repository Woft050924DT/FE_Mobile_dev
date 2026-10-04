import assert from 'assert';

/**
 * Test Suite: Auth Context Roles & Permissions Logic
 */

export function resolveUserRoles(role: string | null | undefined) {
  return {
    isDoctor: role === 'doctor',
    isCskh: role === 'cskh',
    isPatient: role === 'patient' || !role,
    isAdmin: role === 'admin',
  };
}

export async function testAuthRoles() {
  console.log('\n--- [FE TEST SUITE 1: AUTH ROLES & PERMISSIONS] ---');
  console.log('Testing role determination for Doctor, CSKH, and Patient...');

  // 1. Doctor role
  const doctor = resolveUserRoles('doctor');
  assert.strictEqual(doctor.isDoctor, true, 'doctor role phải có isDoctor = true');
  assert.strictEqual(doctor.isPatient, false, 'doctor role không được là isPatient');
  assert.strictEqual(doctor.isCskh, false, 'doctor role không được là isCskh');

  // 2. CSKH role
  const cskh = resolveUserRoles('cskh');
  assert.strictEqual(cskh.isCskh, true, 'cskh role phải có isCskh = true');
  assert.strictEqual(cskh.isDoctor, false, 'cskh role không được là isDoctor');
  assert.strictEqual(cskh.isPatient, false, 'cskh role không được là isPatient');

  // 3. Patient role
  const patient = resolveUserRoles('patient');
  assert.strictEqual(patient.isPatient, true, 'patient role phải có isPatient = true');
  assert.strictEqual(patient.isDoctor, false, 'patient role không được là isDoctor');
  assert.strictEqual(patient.isCskh, false, 'patient role không được là isCskh');

  // 4. Default / unauthenticated (assumes patient experience)
  const guest = resolveUserRoles(null);
  assert.strictEqual(guest.isPatient, true, 'Không có role mặc định là patient');
  assert.strictEqual(guest.isDoctor, false, 'Không có role không được là doctor');

  console.log('  ✔ Auth Roles & Permissions passed all assertions.');
}
