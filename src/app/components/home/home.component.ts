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
        try {
            this.data = JSON.parse( this.fs.readFileSync(this.filePath).toString());
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log( 'there seems to be an issue getting the current data' );
        }
    }

    activateTask( task) {
        if ( !task ) {
            return false;
        }
        clearInterval( this.currentInterval );
        this.currentTaskID = task.id;
        if ( task.isActive ) {
            task.isActive = false;
            this.updateData();
        } else {
            task.isActive = true;
            this.currentTaskStartTime = new Date();
            task.startTime = this.currentTaskStartTime;
            this.currentInterval = setInterval( () => this.updateTask(task), 1000 );
        }
    }

    updateTask( task ) {
        task.elapsed ++;
        if ( task.elapsed === task.time ) {
            clearInterval( this.currentInterval );
            task.isComplete = true;
        }
        if ( task.elapsed > task.time ) {
            task.elapsed = task.time;
            clearInterval( this.currentInterval );
        }
        task.progress = ( (task.elapsed)/( task.time) ) * 100;
        this.updateData();
    }

    clearTask() {
        this.data = [];
        this.updateData();
    }

    updateData() {
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    markItemComplete( task ) {
        task.isTicked = true;
        this.updateData();
    }

    sanitizeData() {
        for ( let todo of this.data ) {
            if ( todo.elapsed === null || todo.elapsed === undefined ) {
                todo.elapsed = 0;
                console.log( todo.elapsed );
            } else if ( todo.elapsed > todo.time ) {
                todo.elapsed = todo.time;
            } else if ( todo.elapsed < 0 ) {
                todo.elapsed = 0;
            } else {
                // Do nothing
            }
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
        const task = breakDownString[1];
        this.data.push({
            id: taskID,
            time : parseInt( time, 10 ),
            elapsed: 0,
            name : task
        });
        this.updateData();
    }

    ngOnInit() {
        this.getCurrentList();
        this.sanitizeData();
        this.updateData();
  }

}
