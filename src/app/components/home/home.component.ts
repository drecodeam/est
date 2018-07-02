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
    currentTaskID;
    currentTaskStartTime;
    currentInterval;

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

    activateTask( task) {
        if ( !task ) {
            return false;
        }
        this.currentTaskID = task.id;
        if ( task.isActive ) {
            task.isActive = false;
            clearInterval( this.currentInterval );
            console.log( this.data );
            this.updateData();
        } else {
            task.isActive = true;
            this.currentTaskStartTime = new Date();
            task.startTime = this.currentTaskStartTime;
            this.currentInterval = setInterval( () => this.updateTask(task), 1000 );
        }

    }

    updateTask( task ) {
        task.time --;
    }

    clearTask() {
        this.data = [];
        this.updateData();
    }

    updateData() {
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    addTask( inputString: String ) {
        if ( !inputString ) {
            return false;
        }
        const taskID = new Date().getUTCMilliseconds();
        const breakDownString = inputString.split( '|' );
        let time = breakDownString[0];
        time = time.split( 'm' )[0];
        const task = breakDownString[1];
        this.data.push({
            id: taskID,
            time : parseInt( time, 10 ),
            remaining: parseInt( time, 10 ),
            name : task
        });
        this.updateData();
    }

    ngOnInit() {
        this.getCurrentList();
        this.updateData();
  }

}
