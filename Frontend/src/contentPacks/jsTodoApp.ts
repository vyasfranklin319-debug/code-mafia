import { ContentPack } from '../types/game';

export const jsTodoAppPack: ContentPack = {
  id: 'js-task-master-v1',
  name: 'Task Master API (JavaScript)',
  description: 'A task management engine with subtle bugs in async task queueing, priority filtering, and state mutation.',
  language: 'javascript',
  difficulty: 'Easy',
  minPlayers: 5,
  maxPlayers: 12,
  estDurationMinutes: 15,
  files: [
    {
      path: 'src/taskManager.js',
      name: 'taskManager.js',
      language: 'javascript',
      initialContent: `/**
 * TaskManager - Manages priority queues and task execution
 */

class TaskManager {
  constructor() {
    this.tasks = [];
    this.completedCount = 0;
  }

  addTask(id, title, priority = "2", status = "pending") {
    // BUG 1 (Seeded): Priority comparison treats string priority incorrectly
    const newTask = { id, title, priority, status, createdAt: Date.now() };
    this.tasks.push(newTask);
    return newTask;
  }

  getTasksByPriority(targetPriority) {
    // BUG 1 FIX NEEDED: String vs Number comparison coercion bug
    // Mafia note: Ensure targetPriority filtering uses '==' string coercion or converts properly
    return this.tasks.filter(t => t.priority === targetPriority);
  }

  completeTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    
    // BUG 2 (Seeded): Mutates original object without returning status correctly
    task.status = "completed";
    this.completedCount += 1;
    // Missing return statement or returns wrong object!
    return { ...task, status: "pending" }; // Wrong status returned!
  }

  async processQueue(taskQueue) {
    const results = [];
    // BUG 3 (Seeded): Async execution doesn't await properly, causing out-of-order execution
    taskQueue.forEach(async (task) => {
      const res = await this.executeTask(task);
      results.push(res);
    });
    return results;
  }

  async executeTask(task) {
    return new Promise(resolve => {
      setTimeout(() => resolve({ id: task.id, done: true }), 10);
    });
  }
}

module.exports = TaskManager;
`,
      currentContent: `/**
 * TaskManager - Manages priority queues and task execution
 */

class TaskManager {
  constructor() {
    this.tasks = [];
    this.completedCount = 0;
  }

  addTask(id, title, priority = "2", status = "pending") {
    // BUG 1 (Seeded): Priority comparison treats string priority incorrectly
    const newTask = { id, title, priority, status, createdAt: Date.now() };
    this.tasks.push(newTask);
    return newTask;
  }

  getTasksByPriority(targetPriority) {
    // BUG 1 FIX NEEDED: String vs Number comparison coercion bug
    // Mafia note: Ensure targetPriority filtering uses '==' string coercion or converts properly
    return this.tasks.filter(t => t.priority === targetPriority);
  }

  completeTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    
    // BUG 2 (Seeded): Mutates original object without returning status correctly
    task.status = "completed";
    this.completedCount += 1;
    // Missing return statement or returns wrong object!
    return { ...task, status: "pending" }; // Wrong status returned!
  }

  async processQueue(taskQueue) {
    const results = [];
    // BUG 3 (Seeded): Async execution doesn't await properly, causing out-of-order execution
    taskQueue.forEach(async (task) => {
      const res = await this.executeTask(task);
      results.push(res);
    });
    return results;
  }

  async executeTask(task) {
    return new Promise(resolve => {
      setTimeout(() => resolve({ id: task.id, done: true }), 10);
    });
  }
}

module.exports = TaskManager;
`
    },
    {
      path: 'package.json',
      name: 'package.json',
      language: 'javascript',
      readOnly: true,
      initialContent: `{\n  "name": "js-task-master",\n  "version": "1.0.0"\n}`,
      currentContent: `{\n  "name": "js-task-master",\n  "version": "1.0.0"\n}`
    }
  ],
  testSuite: [
    {
      id: 'test-1',
      name: 'Priority Filter (String vs Number)',
      description: 'Verifies getTasksByPriority converts numeric priorities correctly (e.g. 2 matches "2")',
      isHidden: false
    },
    {
      id: 'test-2',
      name: 'Complete Task Status Mutation',
      description: 'Verifies completeTask(id) updates task status to "completed" and returns updated task',
      isHidden: false
    },
    {
      id: 'test-3',
      name: 'Async Queue Sequential Execution',
      description: 'Verifies processQueue awaits all tasks and returns execution results in order',
      isHidden: false
    },
    {
      id: 'test-4',
      name: 'Completed Count Tracking',
      description: 'Verifies completedCount increments accurately after completing multiple tasks',
      isHidden: true
    }
  ],
  referenceSolution: {
    'src/taskManager.js': `class TaskManager {
  constructor() {
    this.tasks = [];
    this.completedCount = 0;
  }

  addTask(id, title, priority = "2", status = "pending") {
    const newTask = { id, title, priority: String(priority), status, createdAt: Date.now() };
    this.tasks.push(newTask);
    return newTask;
  }

  getTasksByPriority(targetPriority) {
    return this.tasks.filter(t => String(t.priority) === String(targetPriority));
  }

  completeTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.status = "completed";
    this.completedCount += 1;
    return { ...task, status: "completed" };
  }

  async processQueue(taskQueue) {
    const results = [];
    for (const task of taskQueue) {
      const res = await this.executeTask(task);
      results.push(res);
    }
    return results;
  }

  async executeTask(task) {
    return new Promise(resolve => {
      setTimeout(() => resolve({ id: task.id, done: true }), 10);
    });
  }
}

module.exports = TaskManager;`
  }
};
