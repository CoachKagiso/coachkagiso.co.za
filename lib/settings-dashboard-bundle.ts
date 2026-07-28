export type SettingsDashboardBundle<TSettings, TEmailTemplates> = {
  settings: TSettings;
  emailTemplates: TEmailTemplates;
};

export async function loadSettingsDashboardBundle<TSettings, TEmailTemplates>(input: {
  defaults: SettingsDashboardBundle<TSettings, TEmailTemplates>;
  loadSettings: () => Promise<TSettings>;
  loadEmailTemplates: () => Promise<TEmailTemplates>;
}): Promise<SettingsDashboardBundle<TSettings, TEmailTemplates>> {
  const [settingsResult, emailTemplatesResult] = await Promise.allSettled([
    input.loadSettings(),
    input.loadEmailTemplates(),
  ]);

  return {
    settings: settingsResult.status === 'fulfilled' ? settingsResult.value : input.defaults.settings,
    emailTemplates: emailTemplatesResult.status === 'fulfilled'
      ? emailTemplatesResult.value
      : input.defaults.emailTemplates,
  };
}
