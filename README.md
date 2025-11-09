# Two-Pass Hierarchical Z-Buffer Occlusion Culling in WebGPU

### Install on MacOS

1. Run `npm install` in the terminal.
2. Run `npm run build` in the terminal.
3. In `.vscode/settings.json` adjust the absolute path to match your machine.
4. Go live via the VSCode Live Server extension.

### Code Conventions

-   abstract classes in a seperate folder
-   definitions in a seperate folder and file for each major part
-   utilities for language only helper classes
-   enums with manual assignments
-   objects properties readonly whenever possible
-   never use undefined, always replace with ?? null/Nullable<...>. Dont use questionmarks either when possible.
-   distinguish between int and float
-   not exported types and enums dont need major part prefix
-   classes in major parts generally extend abstractdestroyable class
-   make everything properly destroyable to prevent memory leaks
-   class properties initialize only in constructor, same order and only oneliners, if longer extract into seperate class
-   constructor as few parameters as possible
-   constructor next higher parent in nested as parameter
-   link destroy when parent gets destroyed, same with initializer etc.
-   all public functions must have this.notDestroyed() at the beginning
-   public/private methods not ordered by accessor but like a story
-   methods should be 25 lines or less generally
-   avoid line wrappings
-   name event listener methods on...
-   not blank lines in methods between code
-   Copyright comment at beginning of file
-   class top static properites with no strict public/private ordering
-   static properties first letter uppercase
-   after static the regular properities, also not sorted public/private
-   after properties constructor then regular methods
-   end of class static methods, also in story order (public/private)
-   use own log/warn/assert
-   warn/error always classname: message
-   eventbased nested classes so no manual hooking
-   when dependency in method is too long make local const at the top
-   class properites order: first parent, then events, then rest
-   own async/eventemitters and vector/matrix classes
-   commit messages first letter uppercase
-   as much as possible private, least as possible public
-   abstract classes begin with Abstract...
-   all export type/enum definitions in definitions file
-   all private non export definitions in class file
-   use timing system from renderer and onAnimationFrame
-   typescript objects always follow with as "TYPE"
