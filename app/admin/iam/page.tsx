import IAMConsole from '@/components/admin/iam-console';

export const metadata = {
  title: 'IAM Console | Digital Universe',
  description: 'Manage identities, roles and system connections.',
};

export default function IAMConsolePage() {
  return (
    <div className="min-h-screen bg-background">
      <IAMConsole />
    </div>
  );
}
