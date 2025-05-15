# SmartHomeUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.8.

## Environment Configuration

For security reasons, environment files containing sensitive information (like API credentials) are not committed to the repository. Before running the application, you'll need to set up your environment:

1. Create a file `src/environments/environment.ts` based on the example template:
   ```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   ```

2. Edit `environment.ts` and populate it with your actual credentials:
   ```typescript
   export const environment = {
     production: false,
     mqtt: {
       host: 'your-mqtt-broker-host',
       port: 8884,
       protocol: 'wss',
       path: '/mqtt',
       username: 'your-username',
       password: 'your-password',
       clientId: 'smart-home-ui-' + Math.random().toString(16).substring(2, 8)
     }
   };
   ```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
