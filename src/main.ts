import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { AppConfig } from './environments/environment';
// import {autoUpdater} from 'electron-updater';



if (AppConfig.production) {
  enableProdMode();
}

console.log( 'reached here' );
// autoUpdater.checkForUpdatesAndNotify();
platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    preserveWhitespaces: false
  })
  .catch(err => console.error(err));
