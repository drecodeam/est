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

    filePath = this.electronService.remote.app.getPath('appData') + '/list.json';
    data;
    fs = this.electronService.fs;
    currentTaskID;
    currentTaskStartTime;
    currentInterval;
    currentActiveTask;
    touchBarButton = this.electronService.remote.TouchBar.TouchBarButton;
    addTaskInput;
    totalTime = 0;
    totalHrs;
    totalMins;
    eta: any;
    status = {
        showOnboarding: false,
        showTime: false,
        showEmptyState: false
    };
    showOnboarding = false;

    initiateData() {
        this.data = {
            hideOnboarding : false,
            list: []
        };
        try {
            this.fs.writeFileSync(this.filePath, this.data, 'utf-8');
        } catch ( error ) {
            console.log( error );
        }
    }

    /**
     * Update the current task items from the list
     */
    getCurrentList() {
        try {
            this.data = JSON.parse( this.fs.readFileSync(this.filePath).toString());
            if ( !this.data ) {
                return false;
            }
            return true;
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log( 'there seems to be an issue getting the current data' );
            return false;
        }
    }

    /**
     * Start the timer on a task
     * @param task
     * @returns {boolean}
     */
    activateTask( task ) {
        if ( !task ) {
            return false;
        }
        clearInterval( this.currentInterval );
        this.currentTaskID = task.id;

        if ( task.isActive ) {
            task.isActive = false;
            this.currentTaskID = 0;
            this.updateData();
        } else {
            this.currentActiveTask = task;
            task.isActive = true;
            this.currentTaskStartTime = new Date();
            task.startTime = this.currentTaskStartTime;
            this.currentInterval = setInterval( () => this.updateTaskUI(task), 600 );
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
        this.totalTime--;
        this.updateEta();
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
     * Clear all the tasks.
     * Only used in development purpose for releasing a new build
     */
    clearTask() {
        this.data = '';
        this.updateData();
    }

    /**
     * Sync data onto the file
     */
    updateData() {
        if ( this.data.list.length <= 0 ) {
            this.status.showEmptyState = true;
        } else {
            this.status.showEmptyState = false;
        }
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    /**
     *
     * @param date
     */
    formatAMPM(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        this.eta = hours + ':' + minutes + ' ' + ampm;
    }

    /**
     * Mark the item as complete
     * @param task
     */
    markItemComplete( task ) {
        task.isTicked = true;
        this.totalTime = this.totalTime - ( task.time - task.elapsed );
        this.currentTaskID = 0;
        this.updateEta();
        this.updateData();
    }

    /**
     * Mark the item as complsete
     * @param task
     */
    deleteItem( task ) {
        this.data.list.forEach( (todo, index, list) => {
            if ( task.id === todo.id ) {
                list.splice( index, 1 );
            }
        });
        if ( !task.isTicked ) {
            this.totalTime = this.totalTime - ( task.time - task.elapsed );
            this.updateEta();
            this.updateData();
        }
    }

    /**
     * Update the ETA on the top right
     */
    updateEta() {
        const time = this.totalTime;
        if ( this.totalTime > 0 ) {
            this.status.showTime = true;
        } else {
            this.status.showTime = false;
        }
        this.totalHrs = Math.floor( this.totalTime/60 );
        this.totalMins = this.totalTime % 60;
        const date = new Date( new Date().getTime() + time * 60000 );
        this.formatAMPM( date );
    }

    /**
     * Sanitize the list whenever the app loads.
     * Basically remove bogus entries, empty entries, completed entries etc
     */
    sanitizeData()  {
        this.data.list.forEach( (todo, index, list) => {
            if ( todo.elapsed === null || todo.elapsed === undefined ) {
                todo.elapsed = 0;
            } else if ( todo.elapsed > todo.time ) {
                todo.elapsed = todo.time;
            } else if ( todo.elapsed < 0 ) {
                todo.elapsed = 0;
            } else if ( todo.isTicked ) {
                list.splice( index, 1 );
            } else {
                this.totalTime += ( todo.time - todo.elapsed );
                this.updateEta();
            }
        });
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
        this.sanitizeData();
        this.updateEta();
        this.updateData();
    }

    /**
     * Close onboarding and save it in settings
     */
    closeOnboarding() {
        this.showOnboarding = false;
        this.data.hideOnboarding = true;
        this.updateData();
    }

    ngOnInit() {
        if ( this.getCurrentList() ) {
            this.sanitizeData();
        } else {
            this.initiateData();
        }
        this.updateData();
        if ( !this.data.hideOnboarding ) {
            setTimeout(() => {
                this.showOnboarding = true;
            }, 1000);
        }
    }
}
