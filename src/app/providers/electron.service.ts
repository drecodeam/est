import { Injectable } from '@angular/core';
import { ipcRenderer, webFrame, remote, globalShortcut } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;
  globalShortcut: typeof globalShortcut;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;
      this.remote = window.require('electron').remote;
      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
      this.globalShortcut = window.require( 'electron' ).globalShortcut;
      console.log( window.require( 'electron') );
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

}
