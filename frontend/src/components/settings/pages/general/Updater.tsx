import { DialogButton, Field, ProgressBarWithInfo, Spinner } from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { FaArrowDown } from 'react-icons/fa';

import { callUpdaterMethod, finishUpdate } from '../../../../updater';

interface VerInfo {
  current: string;
  remote: {
    assets: {
      browser_download_url: string;
      created_at: string;
    }[];
    name: string;
    body: string;
    prerelease: boolean;
    published_at: string;
    tag_name: string;
  } | null;
  updatable: boolean;
}

export default function UpdaterSettings() {
  const [versionInfo, setVersionInfo] = useState<VerInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number>(-1);
  const [reloading, setReloading] = useState<boolean>(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const res = (await callUpdaterMethod('get_version')) as { result: VerInfo };
      setVersionInfo(res.result);
    })();
  }, []);

  return (
    <Field
      label="Updates"
      description={
        versionInfo && (
          <span style={{ whiteSpace: 'pre-line' }}>{`Current version: ${versionInfo.current}\n${
            versionInfo.updatable ? `Latest version: ${versionInfo.remote?.tag_name}` : ''
          }`}</span>
        )
      }
      icon={
        !versionInfo ? (
          <Spinner style={{ width: '1em', height: 20, display: 'block' }} />
        ) : (
          <FaArrowDown style={{ display: 'block' }} />
        )
      }
    >
      {updateProgress == -1 ? (
        <DialogButton
          disabled={!versionInfo?.updatable || checkingForUpdates}
          onClick={
            !versionInfo?.remote || versionInfo?.remote?.tag_name == versionInfo?.current
              ? async () => {
                  setCheckingForUpdates(true);
                  const res = (await callUpdaterMethod('check_for_updates')) as { result: VerInfo };
                  setVersionInfo(res.result);
                  setCheckingForUpdates(false);
                }
              : async () => {
                  window.DeckyUpdater = {
                    updateProgress: (i) => {
                      setUpdateProgress(i);
                    },
                    finish: async () => {
                      setUpdateProgress(0);
                      setReloading(true);
                      await finishUpdate();
                    },
                  };
                  setUpdateProgress(0);
                  callUpdaterMethod('do_update');
                }
          }
        >
          {checkingForUpdates
            ? 'Checking'
            : !versionInfo?.remote || versionInfo?.remote?.tag_name == versionInfo?.current
            ? 'Check For Updates'
            : 'Install Update'}
        </DialogButton>
      ) : (
        <ProgressBarWithInfo
          layout="inline"
          bottomSeparator={false}
          nProgress={updateProgress}
          indeterminate={reloading}
          sOperationText={reloading ? 'Reloading' : 'Updating'}
        />
      )}
    </Field>
  );
}
