import { Component, OnInit } from '@angular/core';
import { ElectronService} from '../../providers/electron.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(
      private electronService: ElectronService
  ) {}

    filePath = this.electronService.remote.app.getAppPath() + '/list.json';
    data = [];
    fs = this.electronService.fs;

    /**
     * Update the current task items from the list
     */
    getCurrentList() {
        // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
        // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
        try {
            this.data = JSON.parse( this.fs.readFileSync(this.filePath).toString());
            console.log( this.data );
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log( 'there seems to be an issue getting the current data' );
        }
    }

    addTask( inputString: String ) {
        if ( !inputString ) {
            return false;
        }
        const taskID = new Date().getUTCMilliseconds();
        const breakDownString = inputString.split( '|' );
        let time = breakDownString[0];
        time = time.split( 'm' )[0];
        console.log( breakDownString );
        const task = breakDownString[1];
        this.data.push({
            id: taskID,
            time : time,
            name : task
        });
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    ngOnInit() {
        this.getCurrentList();
        this.electronService.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
  }

}
