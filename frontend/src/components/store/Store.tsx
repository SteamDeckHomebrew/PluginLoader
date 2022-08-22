import { SteamSpinner } from 'decky-frontend-lib';
import { FC, useEffect, useState } from 'react';

import { LegacyStorePlugin, StorePlugin, getLegacyPluginList, getPluginList } from '../../store';
import PluginCard from './PluginCard';

const StorePage: FC<{}> = () => {
  const [data, setData] = useState<StorePlugin[] | null>(null);
  const [legacyData, setLegacyData] = useState<LegacyStorePlugin[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getPluginList();
      console.log(res);
      setData(res);
    })();
    (async () => {
      const res = await getLegacyPluginList();
      console.log(res);
      setLegacyData(res);
    })();
  }, []);

  return (
    <div
      style={{
        marginTop: '40px',
        height: 'calc( 100% - 40px )',
        overflowY: 'scroll',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {!data ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner />
          </div>
        ) : (
          <div>
            {data.map((plugin: StorePlugin) => (
              <PluginCard plugin={plugin} />
            ))}
            {!legacyData ? (
              <SteamSpinner />
            ) : (
              legacyData.map((plugin: LegacyStorePlugin) => <PluginCard plugin={plugin} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
