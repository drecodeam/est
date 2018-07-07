import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../providers/electron.service';

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
    data;
    fs = this.electronService.fs;
    currentTaskID;
    currentTaskStartTime;
    currentInterval;
    touchBarButton = this.electronService.remote.TouchBar.TouchBarButton;
    addTaskInput;
    hideOnboarding = false;
    showOnboarding = false;


    /**
     * Update the current task items from the list
     */
    getCurrentList() {
        try {
            this.data = JSON.parse( this.fs.readFileSync(this.filePath).toString());
            console.log( this.data );
            if ( !this.data ) {
                this.data = {};
                this.data.list = [];
            }
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log( 'there seems to be an issue getting the current data' );
        }
    }

    /**
     * Start the timer on a task
     * @param task
     * @returns {boolean}
     */
    activateTask(task) {
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
            this.currentInterval = setInterval( () => this.updateTaskUI(task), 1000 );
        }
    }

    /**
     * Update the UI of the active task
     * @param task
     */
    updateTaskUI(task) {
        const timeLeft = task.time - task.elapsed;
        const label = new this.touchBarButton ({
            label: timeLeft + 'm | ' + task.name
        });
        const touchhBar = new this.electronService.remote.TouchBar({
            items : [label]
        });
        this.electronService.remote.getCurrentWindow().setTouchBar(touchhBar);
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

    /**
     * Clear all the tasks
     */
    clearTask() {
        this.data = [];
        this.updateData();
    }

    /**
     * Sync data onto the file
     */
    updateData() {
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    /**
     * Mark the item as complete
     * @param task
     */
    markItemComplete( task ) {
        task.isTicked = true;
        this.updateData();
    }

    /**
     * Sanitize the list whenever the app loads.
     * Basically remove bogus entries, empty entries, completed entries etc
     */
    sanitizeData() {
        for ( let todo of this.data.list ) {
            if ( todo.elapsed === null || todo.elapsed === undefined ) {
                todo.elapsed = 0;
            } else if ( todo.elapsed > todo.time ) {
                todo.elapsed = todo.time;
            } else if ( todo.elapsed < 0 ) {
                todo.elapsed = 0;
            } else {
                // Do nothing
            }
        }
    }

    /**
     * Add a new task
     * @param {String} inputString
     * @returns {boolean}
     */
    addTask( inputString: String ) {
        if ( !inputString ) {
            return false;
        }

        const taskID = new Date().getUTCMilliseconds();
        const breakDownString = inputString.split( '|' );
        let timeString = breakDownString[0];
        timeString = timeString.split( 'm' )[0];
        const time = parseInt( timeString, 10 );
        if ( isNaN(time)  || time === 0 ) {
            return false;
        }
        this.addTaskInput = '';
        const task = breakDownString[1];
        this.data.list.push({
            id: taskID,
            time : time,
            elapsed: 0,
            name : task
        });
        this.updateData();
    }

    closeOnboarding() {
        this.showOnboarding = false;
    }

    ngOnInit() {
        this.getCurrentList();
        this.sanitizeData();
        this.updateData();
        setTimeout(() => {
            this.showOnboarding = true;
        }, 1000);
    }
}
