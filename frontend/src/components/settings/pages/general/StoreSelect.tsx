import { Dropdown, Field, TextField, showModal } from '@decky/ui';
import { FunctionComponent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShapes } from 'react-icons/fa';

import Logger from '../../../../logger';
import { Store } from '../../../../store';
import { WarnThirdPartyType } from '../../../../utils/globalTypes';
import { useSetting } from '../../../../utils/hooks/useSetting';
import WarnThirdParty from '../../../modals/WarnThirdParty';

const logger = new Logger('StoreSelect');

const StoreSelect: FunctionComponent<{}> = () => {
  const [selectedStore, setSelectedStore] = useSetting<Store>('store', Store.Default);
  const [selectedStoreURL, setSelectedStoreURL] = useSetting<string | null>('store-url', null);
  const [acceptedWarning, setAcceptedWarning] = useSetting<boolean>('store_select.warn.third_party', false);
  const waitTime = acceptedWarning ? 0 : 5;
  const { t } = useTranslation();
  const tStores = [
    t('StoreSelect.store_channel.default'),
    t('StoreSelect.store_channel.testing'),
    t('StoreSelect.store_channel.custom'),
  ];

  // Returns numerical values from 0 to 2 (with current branch setup as of 8/28/22)
  // 0 being Default, 1 being Testing and 2 being Custom
  return (
    <>
      <Field label={t('StoreSelect.store_channel.label')} childrenContainerWidth={'fixed'}>
        <Dropdown
          rgOptions={Object.values(Store)
            .filter((store) => typeof store == 'number')
            .map((store) => ({
              label: tStores[store as number],
              data: store,
            }))}
          selectedOption={selectedStore}
          onChange={async (newVal) => {
            await setSelectedStore(newVal.data);
            logger.log('switching stores!');
          }}
        />
      </Field>
      {selectedStore == Store.Custom &&
        showModal(
          <WarnThirdParty
            type={WarnThirdPartyType.REPO}
            seconds={waitTime}
            onOK={() => {
              setAcceptedWarning(true);
            }}
            onCancel={() => setSelectedStore(Store.Default)}
          />,
        ) && (
          <Field
            label={t('StoreSelect.custom_store.label')}
            indentLevel={1}
            description={
              <TextField
                label={t('StoreSelect.custom_store.url_label')}
                value={selectedStoreURL || undefined}
                onChange={(e) => setSelectedStoreURL(e?.target.value || null)}
              />
            }
            icon={<FaShapes style={{ display: 'block' }} />}
          ></Field>
        )}
    </>
  );
};

export default StoreSelect;
