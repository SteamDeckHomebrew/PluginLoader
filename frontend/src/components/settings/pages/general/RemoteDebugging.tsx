import { Field, Toggle } from '@decky/ui';
import { useTranslation } from 'react-i18next';
import { FaChrome } from 'react-icons/fa';

import { useSetting } from '../../../../utils/hooks/useSetting';

export default function RemoteDebuggingSettings() {
  const [allowRemoteDebugging, setAllowRemoteDebugging] = useSetting<boolean>('cef_forward', false);
  const { t } = useTranslation();

  return (
    <Field
      label={t('RemoteDebugging.remote_cef.label')}
      description={<span style={{ whiteSpace: 'pre-line' }}>{t('RemoteDebugging.remote_cef.desc')}</span>}
      icon={<FaChrome style={{ display: 'block' }} />}
    >
      <Toggle
        value={allowRemoteDebugging || false}
        onChange={(toggleValue) => {
          setAllowRemoteDebugging(toggleValue);
          if (toggleValue) DeckyBackend.call('allow_remote_debugging');
          else DeckyBackend.call('disallow_remote_debugging');
        }}
      />
    </Field>
  );
}
