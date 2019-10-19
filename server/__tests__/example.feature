Feature: test
    Scenario: teste
        Given I do something simple
        Given I do something simple on other suite
        Given I do something simple with an argument 1
        Given I do something simple with an argument "argument"
        Given I do something simple with an named argument 1
        Given I do something simple with an named argument "arguent 1"
        Given I do something simple with two arguments 1 2
        Given I do something simple with two named arguments 1 2
        Given I do something with regex 122222
        Given I do something with regex 1
        Given I do something with regex and two args "1" "and two"
        Given I do something with optional argument
        Given I do something with argument
        Given I do something with opt argument
        Given I do something with different options
        Given I do something with different choices
        Given I do something with an ugly argument "this is an argument"

        Then I do something simple plus something
        Then I do something simple on other suite plus something
        Then I do something simple with an argument
        Then I don't do something simple with an named argument "arg xpto"
        Then I do something with regex invalid
        Then I do something with regex and two args "one" "two" "three"
        Then I do something with optional  argument
        Then I don't do something with different choices
        Then I do something with an ugly argument
