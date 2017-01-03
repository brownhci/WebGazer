
module.exports = {
    name:    'CreationOfObject',
    maxTime: 2,
    async:   true,
    tests:   [
        {
            name: 'Using pure literal creation:',
            fn:   function () {

                // Declarations && Execution
                var foo = {
                    name:     "name",
                    sayHello: function () {
                        console.log(this.name);
                    }
                };
                // foo.sayHello();

            }
        },
        {
            name: 'Using literal creation:',
            fn:   function () {

                // Declarations
                function Foo(name) {
                    return {
                        name:     name,
                        sayHello: function () {
                            console.log(this.name);
                        }
                    };
                }

                // Execution
                var foo = new Foo("FOO");
                // foo.sayHello();

            }
        },
        {
            name: 'Using prototypal creation',
            fn:   function () {

                function Bar(name) {
                    this.name = name;
                }
                Bar.prototype.sayHello = function () {
                    console.log(this.name);
                };

                // Execution
                var bar = new Bar("BAR");
                // bar.sayHello();
            }
        }
    ]
};
