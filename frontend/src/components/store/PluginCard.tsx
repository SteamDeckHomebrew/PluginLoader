import {
  DialogButton,
  Dropdown,
  Focusable,
  Router,
  SingleDropdownOption,
  SuspensefulImage,
  staticClasses,
} from 'decky-frontend-lib';
import { FC, useRef, useState } from 'react';

import { StorePlugin } from './Store';

interface PluginCardProps {
  plugin: StorePlugin;
}

const classNames = (...classes: string[]) => {
  return classes.join(' ');
};

async function requestPluginInstall(plugin: StorePlugin, selectedVer: string) {
  const formData = new FormData();
  formData.append('artifact', plugin.artifact);
  formData.append('version', selectedVer);
  formData.append('hash', plugin.versions[selectedVer]);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
  });
}

const PluginCard: FC<PluginCardProps> = ({ plugin }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      style={{
        padding: '30px',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      {/* TODO: abstract this messy focus hackiness into a custom component in lib */}
      <Focusable
        // className="Panel Focusable"
        ref={containerRef}
        onActivate={(e: CustomEvent) => {
          buttonRef.current!.focus();
        }}
        onCancel={(e: CustomEvent) => {
          containerRef.current!.querySelectorAll('* :focus').length === 0
            ? Router.NavigateBackOrOpenMenu()
            : containerRef.current!.focus();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ACB2C924',
          height: 'unset',
          marginBottom: 'unset',
          // boxShadow: var(--gpShadow-Medium);
          scrollSnapAlign: 'start',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            style={{ fontSize: '18pt', padding: '10px' }}
            className={classNames(staticClasses.Text)}
            onClick={() => Router.NavigateToExternalWeb('https://github.com/' + plugin.artifact)}
          >
            <span style={{ color: 'grey' }}>{plugin.artifact.split('/')[0]}/</span>
            {plugin.artifact.split('/')[1]}
          </a>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <SuspensefulImage
            suspenseWidth="256px"
            style={{
              width: 'auto',
              height: '160px',
            }}
            src={`https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/artifact_images/${plugin.artifact.replace(
              '/',
              '_',
            )}.png`}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <p className={classNames(staticClasses.PanelSectionRow)}>
              <span>Author: {plugin.author}</span>
            </p>
            <p className={classNames(staticClasses.PanelSectionRow)}>
              <span>Tags:</span>
              {plugin.tags.map((tag: string) => (
                <span
                  style={{
                    padding: '5px',
                    marginRight: '10px',
                    borderRadius: '5px',
                    background: tag == 'root' ? '#842029' : '#ACB2C947',
                  }}
                >
                  {tag == 'root' ? 'Requires root' : tag}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div
          style={{
            width: '100%',
            alignSelf: 'flex-end',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Focusable
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <div
              style={{
                flex: '1',
              }}
            >
              <DialogButton
                ref={buttonRef}
                onClick={() => requestPluginInstall(plugin, Object.keys(plugin.versions)[selectedOption])}
              >
                Install
              </DialogButton>
            </div>
            <div
              style={{
                flex: '0.2',
              }}
            >
              <Dropdown
                rgOptions={
                  Object.keys(plugin.versions).map((v, k) => ({
                    data: k,
                    label: v,
                  })) as SingleDropdownOption[]
                }
                strDefaultLabel={'Select a version'}
                selectedOption={selectedOption}
                onChange={({ data }) => setSelectedOption(data)}
              />
            </div>
          </Focusable>
        </div>
      </Focusable>
    </div>
  );
};

export default PluginCard;
