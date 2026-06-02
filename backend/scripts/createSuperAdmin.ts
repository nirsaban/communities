/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db';
import { User } from '../src/models/User';

function parseArgs(): { email: string; password: string; name?: string } {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) args[m[1]] = m[2];
  }
  if (!args.email || !args.password) {
    console.error('Usage: tsx scripts/createSuperAdmin.ts --email=admin@example.com --password=ChangeMe123 [--name="First Last"]');
    process.exit(1);
  }
  return { email: args.email, password: args.password, name: args.name };
}

async function main(): Promise<void> {
  const { email, password, name } = parseArgs();
  await connectDB();
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.globalRole === 'superadmin') {
        console.log(`User ${email} is already a super admin.`);
        return;
      }
      existing.globalRole = 'superadmin';
      await existing.save();
      console.log(`Promoted ${email} to super admin.`);
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || '',
      globalRole: 'superadmin',
    });
    console.log(`Created super admin ${user.email} (${user._id}).`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error('createSuperAdmin failed:', err);
  process.exit(1);
});
