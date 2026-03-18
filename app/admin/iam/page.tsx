import IAMConsole from '@/components/admin/iam-console';

export const metadata = {
  title: 'Accounts | Digital Universe',
  description: 'Manage user accounts, characters and system connections.',
};

export default function IAMConsolePage() {
  return (
    <div className="min-h-screen bg-background">
      <IAMConsole />
    </div>
  );
}
