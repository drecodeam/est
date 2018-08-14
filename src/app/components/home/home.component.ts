import {Component, OnInit, AfterViewInit, OnChanges, HostListener, ElementRef, Renderer2} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {el} from '../../../../node_modules/@angular/platform-browser/testing/src/browser_util';

export enum KEY_CODE {
    RIGHT_ARROW = 39,
    LEFT_ARROW = 37,
    DOWN_ARROW = 40,
    UP_ARROW = 38,
    N_KEY = 78,
    SPACE_KEY = 32,
    ESCAPE_KEY = 27
}


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {

    constructor(
        private electronService: ElectronService,
        private el: ElementRef,
        private renderer: Renderer2
    ) {
    }

    // COMMONLY USED ELECTRON SERVICE REFERENCES
    filePath = this.electronService.remote.app.getPath('appData') + '/list.json';
    fs = this.electronService.fs;
    app = this.electronService.remote.app;
    window = this.electronService.remote.getCurrentWindow();
    touchBarButton = this.electronService.remote.TouchBar.TouchBarButton;

    data;
    currentTaskID;
    currentTask;
    currentTaskStartTime;
    currentInterval;
    addTaskInput: HTMLInputElement;
    totalTime = 0;
    pointerFirstTask: HTMLInputElement;
    pointerCurrentTask;
    totalHrs;
    totalMins;
    eta: any;
    firstTaskNavigate = false;
    status = {
        showOnboarding: false,
        showTime: false,
        showEmptyState: false
    };
    hideOnboarding = false;
    showOnboarding = false;

    @HostListener('document:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
        this.handleShortcuts( event );
    }

    /**
     * Handle keyboard shortcuts
     * @param event
     */
    handleShortcuts( event: KeyboardEvent ) {
        if ( this.addTaskInput === document.activeElement ) {
            if ( event.keyCode === KEY_CODE.ESCAPE_KEY ) {
                if ( this.addTaskInput === document.activeElement ) {
                    this.addTaskInput.blur();
                }
            }
            return false;
        }
        this.pointerCurrentTask.classList.remove('selected');
        if (event.keyCode === KEY_CODE.DOWN_ARROW) {
            if ( !this.firstTaskNavigate ) {
                this.firstTaskNavigate = true;
                this.pointerCurrentTask.classList.add( 'selected' );
            } else {
                if (this.pointerCurrentTask.nextElementSibling) {
                    this.pointerCurrentTask = this.pointerCurrentTask.nextElementSibling;
                    this.pointerCurrentTask.classList.add('selected');
                }
            }
        }
        if (event.keyCode === KEY_CODE.UP_ARROW) {
            if ( !this.firstTaskNavigate ) {
                this.firstTaskNavigate = true;
                this.pointerCurrentTask.classList.add( 'selected' );
            } else {
                if ( this.pointerCurrentTask.previousElementSibling ) {
                    this.pointerCurrentTask = this.pointerCurrentTask.previousElementSibling;
                    this.pointerCurrentTask.classList.add('selected');
                }
            }
        }
        if (event.keyCode === KEY_CODE.SPACE_KEY ) {
            const currentTask = this.findTaskByID( this.pointerCurrentTask.id );
            this.activateTask( currentTask );
        }

        if ( event.keyCode === KEY_CODE.N_KEY ) {
            this.addTaskInput.value = null;
            this.addTaskInput.focus();
        }

    }

    /**
     * Find a task object given it's ID
     * @param id
     */
    findTaskByID( id ) {
        if ( !id ) {
            console.warn( 'tried calling function findTaskByID without giving ID' );
            return false;
        }
        id = parseInt( id, 10 );
        let task;
        this.data.list.forEach((todo, index, list) => {
            if ( id === todo.id ) {
                task = todo;
            }
        });
        return task;
    }

    /**
     * Create a new file if it does not exist
     */
    initiateData() {
        this.data = {
            hideOnboarding: false,
            list: []
        };
        try {
            this.fs.writeFileSync(this.filePath, this.data, 'utf-8');
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Update the current task items from the list
     */
    getCurrentList() {
        try {
            this.data = JSON.parse(this.fs.readFileSync(this.filePath).toString());
            if (!this.data) {
                this.data = {
                    hideOnboarding: false,
                    list: []
                };
                this.fs.writeFileSync(this.filePath, this.data, 'utf-8');
            }
            return this.data;
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log('there seems to be an issue getting the current data');
            return false;
        }
    }

    /**
     * Start the timer on a task
     * @param task
     * @returns {boolean}
     */
    activateTask(task) {
        if (!task || task.isTicked) {
            return false;
        }
        clearInterval(this.currentInterval);
        this.currentTaskID = task.id;
        this.currentTask = task;
        if (task.isActive) {
            task.isActive = false;
            this.currentTaskID = 0;
            this.updateData();
        } else {
            task.isActive = true;
            this.currentTaskStartTime = new Date();
            task.startTime = this.currentTaskStartTime;
            this.updateTaskUI( task );
            this.currentInterval = setInterval(() => this.updateTaskUI(task), 60000);
        }
    }

    /**
     * Update the UI of the active task
     * @param task
     */
    updateTaskUI(task) {
        const timeLeft = task.time - task.elapsed;
        const label = new this.touchBarButton({
            label: timeLeft + 'm | ' + task.name
        });
        // const touchhBar = new this.electronService.remote.TouchBar({
        //     items: [label]
        // });
        // this.electronService.remote.getCurrentWindow().setTouchBar(touchhBar);
        if ( task.elapsed === task.time ) {
            clearInterval(this.currentInterval);
            task.isComplete = true;
            return;
        }
        if (task.elapsed > task.time) {
            task.elapsed = task.time;
            clearInterval(this.currentInterval);
        }
        task.elapsed++;
        this.totalTime--;
        this.updateEta();
        task.progress = ((task.elapsed) / (task.time)) * 100;
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
        if (this.data.list.length <= 0) {
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
    markItemComplete(task) {
        task.isTicked = true;
        this.totalTime = this.totalTime - (task.time - task.elapsed);
        this.currentTaskID = 0;
        this.updateEta();
        this.updateData();
    }

    /**
     * Mark the item as complsete
     * @param task
     */
    deleteItem(task) {
        this.data.list.forEach((todo, index, list) => {
            if (task.id === todo.id) {
                list.splice(index, 1);
            }
        });
        if (!task.isTicked) {
            this.totalTime = this.totalTime - (task.time - task.elapsed);
            this.updateEta();
            this.updateData();
            setTimeout( () => {this.updateUI(); }, 1);
        }
    }

    /**
     * Update the ETA on the top right
     */
    updateEta() {
        this.status.showTime = ( this.totalTime > 0 );
        this.totalHrs = Math.floor(this.totalTime / 60);
        this.totalMins = this.totalTime % 60;
        const date = new Date(new Date().getTime() + this.totalTime* 60000);
        this.formatAMPM(date);
    }

    /**
     * Sanitize the list whenever the app loads.
     * Basically remove bogus entries, empty entries, completed entries etc
     */
    sanitizeData() {
        this.totalTime = 0;
        this.data.list.forEach((todo, index, list) => {
            if (todo.elapsed === null || todo.elapsed === undefined) {
                todo.elapsed = 0;
            } else if (todo.elapsed > todo.time) {
                todo.elapsed = todo.time;
            } else if (todo.elapsed < 0) {
                todo.elapsed = 0;
            } else if (todo.isTicked) {
                list.splice(index, 1);
            } else {
                this.totalTime += (todo.time - todo.elapsed);
                this.updateEta();
            }
        });
    }

    /**
     * Add a new task
     * @param {String} inputString
     * @returns {boolean}
     */
    addTask(inputString: String) {
        if (!inputString) {
            return false;
        }

        const taskID = new Date().getUTCMilliseconds();
        const breakDownString = inputString.split('|');
        let timeString = breakDownString[0];
        timeString = timeString.split('m')[0];
        const time = parseInt(timeString, 10);
        if (isNaN(time) || time === 0) {
            return false;
        }
        this.addTaskInput.value = '';
        const task = breakDownString[1];
        this.data.list.push({
            id: taskID,
            time: time,
            elapsed: 0,
            name: task
        });
        this.sanitizeData();
        this.updateEta();
        this.updateData();
        setTimeout( () => {this.updateUI(); }, 1);

    }

    updateUI() {
        const taskList: HTMLElement = document.querySelector('.task-list' );
        const etaElement: HTMLElement = document.querySelector('.total-time' );
        if ( etaElement ) {
            const windowHeight = taskList.offsetHeight + this.addTaskInput.offsetHeight + etaElement.offsetHeight;
            console.log( windowHeight );
            this.window.setSize(350, windowHeight, true);
        } else {
            const windowHeight = this.addTaskInput.offsetHeight;
            console.log( windowHeight );
            this.window.setSize(350, windowHeight, true);

        }
    }

    /**
     * Close onboarding and save it in settings
     */
    closeOnboarding() {
        this.showOnboarding = false;
        this.data.hideOnboarding = true;
        this.updateData();
    }

    isElectron = () => {
        return window && window.process && window.process.type;
    }

    ngAfterViewInit() {
        this.pointerFirstTask = document.querySelector('.task-list-item');
        this.pointerCurrentTask = this.pointerFirstTask;
        this.addTaskInput = document.querySelector('.add-task' );
        this.updateUI();
    }

    ngOnInit() {
        this.getCurrentList();
        this.sanitizeData();
        this.updateData();
    }
}
