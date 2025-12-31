Timezone
Timezone
Get the list of available timezone to be used in the fixtures endpoint.

This endpoint does not require any parameters.

Update Frequency : This endpoint contains all the existing timezone, it is not updated.

Recommended Calls : 1 call when you need.

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/timezone

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/timezone');
$request->setRequestMethod('GET');
$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "timezone",
"parameters": [ ],
"errors": [ ],
"results": 425,
"paging": {
"current": 1,
"total": 1
},
"response": [
"Africa/Abidjan",
"Africa/Accra",
"Africa/Addis_Ababa",
"Africa/Algiers",
"Africa/Asmara"
]
}
Countries
Countries
Get the list of available countries for the leagues endpoint.

The name and code fields can be used in other endpoints as filters.

To get the flag of a country you have to call the following url: https://media.api-sports.io/flags/{country_code}.svg

Examples available in Request samples "Use Cases".

All the parameters of this endpoint can be used together.

Update Frequency : This endpoint is updated each time a new league from a country not covered by the API is added.

Recommended Calls : 1 call per day.

query Parameters
name	
string
The name of the country

code	
string [ 2 .. 6 ] characters FR, GB-ENG, IT…
The Alpha code of the country

search	
string = 3 characters
The name of the country

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/countries

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available countries across all {seasons} and competitions
get("https://v3.football.api-sports.io/countries");

// Get all available countries from one country {name}
get("https://v3.football.api-sports.io/countries?name=england");

// Get all available countries from one country {code}
get("https://v3.football.api-sports.io/countries?code=fr");

// Allows you to search for a countries in relation to a country {name}
get("https://v3.football.api-sports.io/countries?search=engl");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "countries",
"parameters": {
"name": "england"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"name": "England",
"code": "GB",
"flag": "https://media.api-sports.io/flags/gb.svg"
}
]
}
Leagues
Leagues
Get the list of available leagues and cups.

The league id are unique in the API and leagues keep it across all seasons

To get the logo of a competition you have to call the following url: https://media.api-sports.io/football/leagues/{league_id}.png

This endpoint also returns the coverage of each competition, which makes it possible to know what is available for that league or cup.

The values returned by the coverage indicate the data available at the moment you call the API, so for a competition that has not yet started, it is normal to have all the features set to False. This will be updated once the competition has started.

You can find all the leagues ids on our Dashboard.

Example :

"coverage": {
  "fixtures": {
      "events": true,
      "lineups": true,
      "statistics_fixtures": false,
      "statistics_players": false
  },
  "standings": true,
  "players": true,
  "top_scorers": true,
  "top_assists": true,
  "top_cards": true,
  "injuries": true,
  "predictions": true,
  "odds": false
}
In this example we can deduce that the competition does not have the following features: statistics_fixtures, statistics_players, odds because it is set to False.

The coverage of a competition can vary from season to season and values set to True do not guarantee 100% data availability.

Some competitions, such as the friendlies, are exceptions to the coverage indicated in the leagues endpoint, and the data available may differ depending on the match, including livescore, events, lineups, statistics and players.

Competitions are automatically renewed by the API when a new season is available. There may be a delay between the announcement of the official calendar and the availability of data in the API.

For Cup competitions, fixtures are automatically added when the two participating teams are known. For example if the current phase is the 8th final, the quarter final will be added once the teams playing this phase are known.

Examples available in Request samples "Use Cases".

Most of the parameters of this endpoint can be used together.

Update Frequency : This endpoint is updated several times a day.

Recommended Calls : 1 call per hour.

query Parameters
id	
integer
The id of the league

name	
string
The name of the league

country	
string
The country name of the league

code	
string [ 2 .. 6 ] characters FR, GB-ENG, IT…
The Alpha code of the country

season	
integer = 4 characters YYYY
The season of the league

team	
integer
The id of the team

type	
string
Enum: "league" "cup"
The type of the league

current	
string Return the list of active seasons or the las...Show pattern
Enum: "true" "false"
The state of the league

search	
string >= 3 characters
The name or the country of the league

last	
integer <= 2 characters
The X last leagues/cups added in the API

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/leagues

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Allows to retrieve all the seasons available for a league/cup
get("https://v3.football.api-sports.io/leagues?id=39");

// Get all leagues from one league {name}
get("https://v3.football.api-sports.io/leagues?name=premier league");

// Get all leagues from one {country}
// You can find the available {country} by using the endpoint country
get("https://v3.football.api-sports.io/leagues?country=england");

// Get all leagues from one country {code} (GB, FR, IT etc..)
// You can find the available country {code} by using the endpoint country
get("https://v3.football.api-sports.io/leagues?code=gb");

// Get all leagues from one {season}
// You can find the available {season} by using the endpoint seasons
get("https://v3.football.api-sports.io/leagues?season=2019");

// Get one league from one league {id} & {season}
get("https://v3.football.api-sports.io/leagues?season=2019&id=39");

// Get all leagues in which the {team} has played at least one match
get("https://v3.football.api-sports.io/leagues?team=33");

// Allows you to search for a league in relation to a league {name} or {country}
get("https://v3.football.api-sports.io/leagues?search=premier league");
get("https://v3.football.api-sports.io/leagues?search=England");

// Get all leagues from one {type}
get("https://v3.football.api-sports.io/leagues?type=league");

// Get all leagues where the season is in progress or not
get("https://v3.football.api-sports.io/leagues?current=true");

// Get the last 99 leagues or cups added to the API
get("https://v3.football.api-sports.io/leagues?last=99");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/leagues?season=2019&country=england&type=league");
get("https://v3.football.api-sports.io/leagues?team=85&season=2019");
get("https://v3.football.api-sports.io/leagues?id=61¤t=true&type=league");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "leagues",
"parameters": {
"id": "39"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"league": {
"id": 39,
"name": "Premier League",
"type": "League",
"logo": "https://media.api-sports.io/football/leagues/2.png"
},
"country": {
"name": "England",
"code": "GB",
"flag": "https://media.api-sports.io/flags/gb.svg"
},
"seasons": [
{
"year": 2010,
"start": "2010-08-14",
"end": "2011-05-17",
"current": false,
"coverage": {
"fixtures": {
"events": true,
"lineups": true,
"statistics_fixtures": false,
"statistics_players": false
},
"standings": true,
"players": true,
"top_scorers": true,
"top_assists": true,
"top_cards": true,
"injuries": true,
"predictions": true,
"odds": false
}
},
{
"year": 2011,
"start": "2011-08-13",
"end": "2012-05-13",
"current": false,
"coverage": {
"fixtures": {
"events": true,
"lineups": true,
"statistics_fixtures": false,
"statistics_players": false
},
"standings": true,
"players": true,
"top_scorers": true,
"top_assists": true,
"top_cards": true,
"injuries": true,
"predictions": true,
"odds": false
}
}
]
}
]
}
Seasons
Get the list of available seasons.

All seasons are only 4-digit keys, so for a league whose season is 2018-2019 like the English Premier League (EPL), the 2018-2019 season in the API will be 2018.

All seasons can be used in other endpoints as filters.

This endpoint does not require any parameters.

Update Frequency : This endpoint is updated each time a new league is added.

Recommended Calls : 1 call per day.

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/leagues/seasons

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/leagues/seasons');
$request->setRequestMethod('GET');
$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "leagues/seasons",
"parameters": [ ],
"errors": [ ],
"results": 12,
"paging": {
"current": 1,
"total": 1
},
"response": [
2008,
2010,
2011,
2012,
2013,
2014,
2015,
2016,
2017,
2018,
2019,
2020
]
}
Teams
Teams information
Get the list of available teams.

The team id are unique in the API and teams keep it among all the leagues/cups in which they participate.

To get the logo of a team you have to call the following url: https://media.api-sports.io/football/teams/{team_id}.png

You can find all the teams ids on our Dashboard.

Examples available in Request samples "Use Cases".

All the parameters of this endpoint can be used together.

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

Tutorials :

HOW TO GET ALL TEAMS AND PLAYERS FROM A LEAGUE ID
query Parameters
id	
integer
The id of the team

name	
string
The name of the team

league	
integer
The id of the league

season	
integer = 4 characters YYYY
The season of the league

country	
string
The country name of the team

code	
string = 3 characters
The code of the team

venue	
integer
The id of the venue

search	
string >= 3 characters
The name or the country name of the team

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/teams

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get one team from one team {id}
get("https://v3.football.api-sports.io/teams?id=33");

// Get one team from one team {name}
get("https://v3.football.api-sports.io/teams?name=manchester united");

// Get all teams from one {league} & {season}
get("https://v3.football.api-sports.io/teams?league=39&season=2019");

// Get teams from one team {country}
get("https://v3.football.api-sports.io/teams?country=england");

// Get teams from one team {code}
get("https://v3.football.api-sports.io/teams?code=FRA");

// Get teams from one venue {id}
get("https://v3.football.api-sports.io/teams?venue=789");

// Allows you to search for a team in relation to a team {name} or {country}
get("https://v3.football.api-sports.io/teams?search=manches");
get("https://v3.football.api-sports.io/teams?search=England");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "teams",
"parameters": {
"id": "33"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 33,
"name": "Manchester United",
"code": "MUN",
"country": "England",
"founded": 1878,
"national": false,
"logo": "https://media.api-sports.io/football/teams/33.png"
},
"venue": {
"id": 556,
"name": "Old Trafford",
"address": "Sir Matt Busby Way",
"city": "Manchester",
"capacity": 76212,
"surface": "grass",
"image": "https://media.api-sports.io/football/venues/556.png"
}
}
]
}
Teams statistics
Returns the statistics of a team in relation to a given competition and season.

It is possible to add the date parameter to calculate statistics from the beginning of the season to the given date. By default the API returns the statistics of all games played by the team for the competition and the season.

Update Frequency : This endpoint is updated twice a day.

Recommended Calls : 1 call per day for the teams who have at least one fixture during the day otherwise 1 call per week.

Here is an example of what can be achieved

demo-teams-statistics

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

team
required
integer
The id of the team

date	
stringYYYY-MM-DD
The limit date

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/teams/statistics

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all statistics for a {team} in a {league} & {season}
get("https://v3.football.api-sports.io/teams/statistics?league=39&team=33&season=2019");

//Get all statistics for a {team} in a {league} & {season} with a end {date}
get("https://v3.football.api-sports.io/teams/statistics?league=39&team=33&season=2019&date=2019-10-08");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "teams/statistics",
"parameters": {
"league": "39",
"season": "2019",
"team": "33"
},
"errors": [ ],
"results": 11,
"paging": {
"current": 1,
"total": 1
},
"response": {
"league": {
"id": 39,
"name": "Premier League",
"country": "England",
"logo": "https://media.api-sports.io/football/leagues/39.png",
"flag": "https://media.api-sports.io/flags/gb-eng.svg",
"season": 2019
},
"team": {
"id": 33,
"name": "Manchester United",
"logo": "https://media.api-sports.io/football/teams/33.png"
},
"form": "WDLDWLDLDWLWDDWWDLWWLWLLDWWDWDWWWWDWDW",
"fixtures": {
"played": {
"home": 19,
"away": 19,
"total": 38
},
"wins": {
"home": 10,
"away": 8,
"total": 18
},
"draws": {
"home": 7,
"away": 5,
"total": 12
},
"loses": {
"home": 2,
"away": 6,
"total": 8
}
},
"goals": {
"for": {
"total": {
"home": 40,
"away": 26,
"total": 66
},
"average": {
"home": "2.1",
"away": "1.4",
"total": "1.7"
},
"minute": {
"0-15": {
"total": 4,
"percentage": "6.06%"
},
"16-30": {
"total": 17,
"percentage": "25.76%"
},
"31-45": {
"total": 11,
"percentage": "16.67%"
},
"46-60": {
"total": 13,
"percentage": "19.70%"
},
"61-75": {
"total": 10,
"percentage": "15.15%"
},
"76-90": {
"total": 8,
"percentage": "12.12%"
},
"91-105": {
"total": 3,
"percentage": "4.55%"
},
"106-120": {
"total": null,
"percentage": null
}
},
"under_over": {
"0.5": {
"over": 30,
"under": 8
},
"1.5": {
"over": 20,
"under": 18
},
"2.5": {
"over": 11,
"under": 27
},
"3.5": {
"over": 4,
"under": 34
},
"4.5": {
"over": 1,
"under": 37
}
}
},
"against": {
"total": {
"home": 17,
"away": 19,
"total": 36
},
"average": {
"home": "0.9",
"away": "1.0",
"total": "0.9"
},
"minute": {
"0-15": {
"total": 6,
"percentage": "16.67%"
},
"16-30": {
"total": 3,
"percentage": "8.33%"
},
"31-45": {
"total": 7,
"percentage": "19.44%"
},
"46-60": {
"total": 9,
"percentage": "25.00%"
},
"61-75": {
"total": 3,
"percentage": "8.33%"
},
"76-90": {
"total": 5,
"percentage": "13.89%"
},
"91-105": {
"total": 3,
"percentage": "8.33%"
},
"106-120": {
"total": null,
"percentage": null
}
},
"under_over": {
"0.5": {
"over": 25,
"under": 13
},
"1.5": {
"over": 10,
"under": 28
},
"2.5": {
"over": 1,
"under": 37
},
"3.5": {
"over": 0,
"under": 38
},
"4.5": {
"over": 0,
"under": 38
}
}
}
},
"biggest": {
"streak": {
"wins": 4,
"draws": 2,
"loses": 2
},
"wins": {
"home": "4-0",
"away": "0-3"
},
"loses": {
"home": "0-2",
"away": "2-0"
},
"goals": {
"for": {
"home": 5,
"away": 3
},
"against": {
"home": 2,
"away": 3
}
}
},
"clean_sheet": {
"home": 7,
"away": 6,
"total": 13
},
"failed_to_score": {
"home": 2,
"away": 6,
"total": 8
},
"penalty": {
"scored": {
"total": 10,
"percentage": "100.00%"
},
"missed": {
"total": 0,
"percentage": "0%"
},
"total": 10
},
"lineups": [
{
"formation": "4-2-3-1",
"played": 32
},
{
"formation": "3-4-1-2",
"played": 4
},
{
"formation": "3-4-2-1",
"played": 1
},
{
"formation": "4-3-1-2",
"played": 1
}
],
"cards": {
"yellow": {
"0-15": {
"total": 5,
"percentage": "6.85%"
},
"16-30": {
"total": 5,
"percentage": "6.85%"
},
"31-45": {
"total": 16,
"percentage": "21.92%"
},
"46-60": {
"total": 12,
"percentage": "16.44%"
},
"61-75": {
"total": 14,
"percentage": "19.18%"
},
"76-90": {
"total": 21,
"percentage": "28.77%"
},
"91-105": {
"total": null,
"percentage": null
},
"106-120": {
"total": null,
"percentage": null
}
},
"red": {
"0-15": {
"total": null,
"percentage": null
},
"16-30": {
"total": null,
"percentage": null
},
"31-45": {
"total": null,
"percentage": null
},
"46-60": {
"total": null,
"percentage": null
},
"61-75": {
"total": null,
"percentage": null
},
"76-90": {
"total": null,
"percentage": null
},
"91-105": {
"total": null,
"percentage": null
},
"106-120": {
"total": null,
"percentage": null
}
}
}
}
}
Teams seasons
Get the list of seasons available for a team.

Examples available in Request samples "Use Cases".

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
team
required
integer
The id of the team

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/teams/seasons

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all seasons available for a team from one team {id}
get("https://v3.football.api-sports.io/teams/seasons?team=33");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "teams/seasons",
"parameters": {
"team": "33"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
2010,
2011,
2012,
2013,
2014,
2015,
2016,
2017,
2018,
2019,
2020,
2021
]
}
Teams countries
Get the list of countries available for the teams endpoint.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/teams/countries

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all countries available for the teams endpoints
get("https://v3.football.api-sports.io/teams/countries");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "teams/countries",
"parameters": [ ],
"errors": [ ],
"results": 258,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"name": "England",
"code": "GB",
"flag": "https://media.api-sports.io/flags/gb.svg"
}
]
}
Venues
Venues
Get the list of available venues.

The venue id are unique in the API.

To get the image of a venue you have to call the following url: https://media.api-sports.io/football/venues/{venue_id}.png

Examples available in Request samples "Use Cases".

All the parameters of this endpoint can be used together.

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
id	
integer
The id of the venue

name	
string
The name of the venue

city	
string
The city of the venue

country	
string
The country name of the venue

search	
string >= 3 characters
The name, city or the country of the venue

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/venues

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get one venue from venue {id}
get("https://v3.football.api-sports.io/venues?id=556");

// Get one venue from venue {name}
get("https://v3.football.api-sports.io/venues?name=Old Trafford");

// Get all venues from {city}
get("https://v3.football.api-sports.io/venues?city=manchester");

// Get venues from {country}
get("https://v3.football.api-sports.io/venues?country=england");

// Allows you to search for a venues in relation to a venue {name}, {city} or {country}
get("https://v3.football.api-sports.io/venues?search=trafford");
get("https://v3.football.api-sports.io/venues?search=manches");
get("https://v3.football.api-sports.io/venues?search=England");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "venues",
"parameters": {
"id": "556"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"id": 556,
"name": "Old Trafford",
"address": "Sir Matt Busby Way",
"city": "Manchester",
"country": "England",
"capacity": 76212,
"surface": "grass",
"image": "https://media.api-sports.io/football/venues/556.png"
}
]
}
Standings
Standings
Get the standings for a league or a team.

Return a table of one or more rankings according to the league / cup.

Some competitions have several rankings in a year, group phase, opening ranking, closing ranking etc…

Examples available in Request samples "Use Cases".

Most of the parameters of this endpoint can be used together.

Update Frequency : This endpoint is updated every hour.

Recommended Calls : 1 call per hour for the leagues or teams who have at least one fixture in progress otherwise 1 call per day.

Tutorials :

HOW TO GET STANDINGS FOR ALL CURRENT SEASONS
query Parameters
league	
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

team	
integer
The id of the team

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/standings

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all Standings from one {league} & {season}
get("https://v3.football.api-sports.io/standings?league=39&season=2019");

// Get all Standings from one {league} & {season} & {team}
get("https://v3.football.api-sports.io/standings?league=39&team=33&season=2019");

// Get all Standings from one {team} & {season}
get("https://v3.football.api-sports.io/standings?team=33&season=2019");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "standings",
"parameters": {
"league": "39",
"season": "2019"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"league": {
"id": 39,
"name": "Premier League",
"country": "England",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": "https://media.api-sports.io/flags/gb.svg",
"season": 2019,
"standings": [
[
{
"rank": 1,
"team": {
"id": 40,
"name": "Liverpool",
"logo": "https://media.api-sports.io/football/teams/40.png"
},
"points": 70,
"goalsDiff": 41,
"group": "Premier League",
"form": "WWWWW",
"status": "same",
"description": "Promotion - Champions League (Group Stage)",
"all": {
"played": 24,
"win": 23,
"draw": 1,
"lose": 0,
"goals": {
"for": 56,
"against": 15
}
},
"home": {
"played": 12,
"win": 12,
"draw": 0,
"lose": 0,
"goals": {
"for": 31,
"against": 9
}
},
"away": {
"played": 12,
"win": 11,
"draw": 1,
"lose": 0,
"goals": {
"for": 25,
"against": 6
}
},
"update": "2020-01-29T00:00:00+00:00"
}
]
]
}
}
]
}
Fixtures
Rounds
Get the rounds for a league or a cup.

The round can be used in endpoint fixtures as filters

Examples available in Request samples "Use Cases".

Update Frequency : This endpoint is updated every day.

Recommended Calls : 1 call per day.

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

current	
boolean
Enum: "true" "false"
The current round only

dates	
boolean
Default: false
Enum: "true" "false"
Add the dates of each round in the response

timezone	
string
A valid timezone from the endpoint Timezone

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/rounds

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available rounds from one {league} & {season}
get("https://v3.football.api-sports.io/fixtures/rounds?league=39&season=2019");

// Get all available rounds from one {league} & {season} With the dates of each round
get("https://v3.football.api-sports.io/fixtures/rounds?league=39&season=2019&dates=true");

// Get current round from one {league} & {season}
get("https://v3.football.api-sports.io/fixtures/rounds?league=39&season=2019&current=true");
Response samples
200204499500
Content type
application/json
Example

Default
Default

Copy
Expand allCollapse all
{
"get": "fixtures/rounds",
"parameters": {
"league": "39",
"season": "2019"
},
"errors": [ ],
"results": 38,
"paging": {
"current": 1,
"total": 1
},
"response": [
"Regular Season - 1",
"Regular Season - 2",
"Regular Season - 3",
"Regular Season - 4",
"Regular Season - 5",
"Regular Season - 6",
"Regular Season - 7",
"Regular Season - 8",
"Regular Season - 9",
"Regular Season - 10",
"Regular Season - 11",
"Regular Season - 12",
"Regular Season - 13",
"Regular Season - 14",
"Regular Season - 15",
"Regular Season - 16",
"Regular Season - 17",
"Regular Season - 18",
"Regular Season - 18",
"Regular Season - 19",
"Regular Season - 20",
"Regular Season - 21",
"Regular Season - 22",
"Regular Season - 23",
"Regular Season - 24",
"Regular Season - 25",
"Regular Season - 26",
"Regular Season - 27",
"Regular Season - 28",
"Regular Season - 29",
"Regular Season - 30",
"Regular Season - 31",
"Regular Season - 32",
"Regular Season - 33",
"Regular Season - 34",
"Regular Season - 35",
"Regular Season - 36",
"Regular Season - 37",
"Regular Season - 38"
]
}
Fixtures
For all requests to fixtures you can add the query parameter timezone to your request in order to retrieve the list of matches in the time zone of your choice like “Europe/London“

To know the list of available time zones you have to use the endpoint timezone.

Available fixtures status

SHORT	LONG	TYPE	DESCRIPTION
TBD	Time To Be Defined	Scheduled	Scheduled but date and time are not known
NS	Not Started	Scheduled	
1H	First Half, Kick Off	In Play	First half in play
HT	Halftime	In Play	Finished in the regular time
2H	Second Half, 2nd Half Started	In Play	Second half in play
ET	Extra Time	In Play	Extra time in play
BT	Break Time	In Play	Break during extra time
P	Penalty In Progress	In Play	Penaly played after extra time
SUSP	Match Suspended	In Play	Suspended by referee's decision, may be rescheduled another day
INT	Match Interrupted	In Play	Interrupted by referee's decision, should resume in a few minutes
FT	Match Finished	Finished	Finished in the regular time
AET	Match Finished	Finished	Finished after extra time without going to the penalty shootout
PEN	Match Finished	Finished	Finished after the penalty shootout
PST	Match Postponed	Postponed	Postponed to another day, once the new date and time is known the status will change to Not Started
CANC	Match Cancelled	Cancelled	Cancelled, match will not be played
ABD	Match Abandoned	Abandoned	Abandoned for various reasons (Bad Weather, Safety, Floodlights, Playing Staff Or Referees), Can be rescheduled or not, it depends on the competition
AWD	Technical Loss	Not Played	
WO	WalkOver	Not Played	Victory by forfeit or absence of competitor
LIVE	In Progress	In Play	Used in very rare cases. It indicates a fixture in progress but the data indicating the half-time or elapsed time are not available
Fixtures with the status TBD may indicate an incorrect fixture date or time because the fixture date or time is not yet known or final. Fixtures with this status are checked and updated daily. The same applies to fixtures with the status PST, CANC.

The fixtures ids are unique and specific to each fixture. In no case an ID will change.

Not all competitions have livescore available and only have final result. In this case, the status remains in NS and will be updated in the minutes/hours following the match (this can take up to 48 hours, depending on the competition).

Although the data is updated every 15 seconds, depending on the competition there may be a delay between reality and the availability of data in the API.

Update Frequency : This endpoint is updated every 15 seconds.

Recommended Calls : 1 call per minute for the leagues, teams, fixtures who have at least one fixture in progress otherwise 1 call per day.

Here are several examples of what can be achieved

demo-fixtures

query Parameters
id	
integer
Value: "id"
The id of the fixture

ids	
stringMaximum of 20 fixtures ids
Value: "id-id-id"
One or more fixture ids

live	
string
Enum: "all" "id-id"
All or several leagues ids

date	
stringYYYY-MM-DD
A valid date

league	
integer
The id of the league

season	
integer = 4 characters YYYY
The season of the league

team	
integer
The id of the team

last	
integer <= 2 characters
For the X last fixtures

next	
integer <= 2 characters
For the X next fixtures

from	
stringYYYY-MM-DD
A valid date

to	
stringYYYY-MM-DD
A valid date

round	
string
The round of the fixture

status	
string
Enum: "NS" "NS-PST-FT"
One or more fixture status short

venue	
integer
The venue id of the fixture

timezone	
string
A valid timezone from the endpoint Timezone

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get fixture from one fixture {id}
// In this request events, lineups, statistics fixture and players fixture are returned in the response
get("https://v3.football.api-sports.io/fixtures?id=215662");

// Get fixture from severals fixtures {ids}
// In this request events, lineups, statistics fixture and players fixture are returned in the response
get("https://v3.football.api-sports.io/fixtures?ids=215662-215663-215664-215665-215666-215667");

// Get all available fixtures in play
// In this request events are returned in the response
get("https://v3.football.api-sports.io/fixtures?live=all");

// Get all available fixtures in play filter by several {league}
// In this request events are returned in the response
get("https://v3.football.api-sports.io/fixtures?live=39-61-48");

// Get all available fixtures from one {league} & {season}
get("https://v3.football.api-sports.io/fixtures?league=39&season=2019");

// Get all available fixtures from one {date}
get("https://v3.football.api-sports.io/fixtures?date=2019-10-22");

// Get next X available fixtures
get("https://v3.football.api-sports.io/fixtures?next=15");

// Get last X available fixtures
get("https://v3.football.api-sports.io/fixtures?last=15");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/fixtures?date=2020-01-30&league=61&season=2019");
get("https://v3.football.api-sports.io/fixtures?league=61&next=10");
get("https://v3.football.api-sports.io/fixtures?venue=358&next=10");
get("https://v3.football.api-sports.io/fixtures?league=61&last=10&status=ft");
get("https://v3.football.api-sports.io/fixtures?team=85&last=10&timezone=Europe/london");
get("https://v3.football.api-sports.io/fixtures?team=85&season=2019&from=2019-07-01&to=2020-10-31");
get("https://v3.football.api-sports.io/fixtures?league=61&season=2019&from=2019-07-01&to=2020-10-31&timezone=Europe/london");
get("https://v3.football.api-sports.io/fixtures?league=61&season=2019&round=Regular Season - 1");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "fixtures",
"parameters": {
"live": "all"
},
"errors": [ ],
"results": 4,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"fixture": {
"id": 239625,
"referee": null,
"timezone": "UTC",
"date": "2020-02-06T14:00:00+00:00",
"timestamp": 1580997600,
"periods": {
"first": 1580997600,
"second": null
},
"venue": {
"id": 1887,
"name": "Stade Municipal",
"city": "Oued Zem"
},
"status": {
"long": "Halftime",
"short": "HT",
"elapsed": 45,
"extra": null
}
},
"league": {
"id": 200,
"name": "Botola Pro",
"country": "Morocco",
"logo": "https://media.api-sports.io/football/leagues/115.png",
"flag": "https://media.api-sports.io/flags/ma.svg",
"season": 2019,
"round": "Regular Season - 14"
},
"teams": {
"home": {
"id": 967,
"name": "Rapide Oued ZEM",
"logo": "https://media.api-sports.io/football/teams/967.png",
"winner": false
},
"away": {
"id": 968,
"name": "Wydad AC",
"logo": "https://media.api-sports.io/football/teams/968.png",
"winner": true
}
},
"goals": {
"home": 0,
"away": 1
},
"score": {
"halftime": {
"home": 0,
"away": 1
},
"fulltime": {
"home": null,
"away": null
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
}
]
}
Head To Head
Get heads to heads between two teams.

Update Frequency : This endpoint is updated every 15 seconds.

Recommended Calls : 1 call per minute for the leagues, teams, fixtures who have at least one fixture in progress otherwise 1 call per day.

Here is an example of what can be achieved

demo-h2h

query Parameters
h2h
required
stringID-ID
The ids of the teams

date	
stringYYYY-MM-DD
league	
integer
The id of the league

season	
integer = 4 characters YYYY
The season of the league

last	
integer
For the X last fixtures

next	
integer
For the X next fixtures

from	
stringYYYY-MM-DD
to	
stringYYYY-MM-DD
status	
string
Enum: "NS" "NS-PST-FT"
One or more fixture status short

venue	
integer
The venue id of the fixture

timezone	
string
A valid timezone from the endpoint Timezone

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/headtohead

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all head to head between two {team}
get("https://v3.football.api-sports.io/fixtures/headtohead?h2h=33-34");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/fixtures/headtohead?h2h=33-34");
get("https://v3.football.api-sports.io/fixtures/headtohead?h2h=33-34&status=ns");
get("https://v3.football.api-sports.io/fixtures/headtohead?h2h=33-34&from=2019-10-01&to=2019-10-31");
get("https://v3.football.api-sports.io/fixtures/headtohead?date=2019-10-22&h2h=33-34");
get("https://v3.football.api-sports.io/fixtures/headtohead?league=39&season=2019&h2h=33-34&last=5");
get("https://v3.football.api-sports.io/fixtures/headtohead?league=39&season=2019&h2h=33-34&next=10&from=2019-10-01&to=2019-10-31");
get("https://v3.football.api-sports.io/fixtures/headtohead?league=39&season=2019&h2h=33-34&last=5&timezone=Europe/London");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "fixtures/headtohead",
"parameters": {
"h2h": "33-34",
"last": "1"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"fixture": {
"id": 157201,
"referee": "Kevin Friend, England",
"timezone": "UTC",
"date": "2019-12-26T17:30:00+00:00",
"timestamp": 1577381400,
"periods": {
"first": 1577381400,
"second": 1577385000
},
"venue": {
"id": 556,
"name": "Old Trafford",
"city": "Manchester"
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 39,
"name": "Premier League",
"country": "England",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": "https://media.api-sports.io/flags/gb.svg",
"season": 2019,
"round": "Regular Season - 19"
},
"teams": {
"home": {
"id": 33,
"name": "Manchester United",
"logo": "https://media.api-sports.io/football/teams/33.png",
"winner": true
},
"away": {
"id": 34,
"name": "Newcastle",
"logo": "https://media.api-sports.io/football/teams/34.png",
"winner": false
}
},
"goals": {
"home": 4,
"away": 1
},
"score": {
"halftime": {
"home": 3,
"away": 1
},
"fulltime": {
"home": 4,
"away": 1
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
}
]
}
Statistics
Get the statistics for one fixture.

Available statistics

Shots on Goal
Shots off Goal
Shots insidebox
Shots outsidebox
Total Shots
Blocked Shots
Fouls
Corner Kicks
Offsides
Ball Possession
Yellow Cards
Red Cards
Goalkeeper Saves
Total passes
Passes accurate
Passes %
Update Frequency : This endpoint is updated every minute.

Recommended Calls : 1 call every minute for the teams or fixtures who have at least one fixture in progress otherwise 1 call per day.

Here is an example of what can be achieved

demo-statistics

query Parameters
fixture
required
integer
The id of the fixture

team	
integer
The id of the team

type	
string
The type of statistics

half	
boolean
Default: false
Enum: "true" "false"
Add the halftime statistics in the response Data start from 2024 season for half parameter

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/statistics

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available statistics from one {fixture}
get("https://v3.football.api-sports.io/fixtures/statistics?fixture=215662");

// Get all available statistics from one {fixture} with Fulltime, First & Second Half data
get("https://v3.football.api-sports.io/fixtures/statistics?fixture=215662&half=true");

// Get all available statistics from one {fixture} & {type}
get("https://v3.football.api-sports.io/fixtures/statistics?fixture=215662&type=Total Shots");

// Get all available statistics from one {fixture} & {team}
get("https://v3.football.api-sports.io/fixtures/statistics?fixture=215662&team=463");
Response samples
200204499500
Content type
application/json
Example

Default
Default

Copy
Expand allCollapse all
{
"get": "fixtures/statistics",
"parameters": {
"team": "463",
"fixture": "215662"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"statistics": [
{
"type": "Shots on Goal",
"value": 3
},
{
"type": "Shots off Goal",
"value": 2
},
{
"type": "Total Shots",
"value": 9
},
{
"type": "Blocked Shots",
"value": 4
},
{
"type": "Shots insidebox",
"value": 4
},
{
"type": "Shots outsidebox",
"value": 5
},
{
"type": "Fouls",
"value": 22
},
{
"type": "Corner Kicks",
"value": 3
},
{
"type": "Offsides",
"value": 1
},
{
"type": "Ball Possession",
"value": "32%"
},
{
"type": "Yellow Cards",
"value": 5
},
{
"type": "Red Cards",
"value": 1
},
{
"type": "Goalkeeper Saves",
"value": null
},
{
"type": "Total passes",
"value": 242
},
{
"type": "Passes accurate",
"value": 121
},
{
"type": "Passes %",
"value": null
}
]
}
]
}
Events
Get the events from a fixture.

Available events

TYPE				
Goal	Normal Goal	Own Goal	Penalty	Missed Penalty
Card	Yellow Card	Red card		
Subst	Substitution [1, 2, 3...]			
Var	Goal cancelled	Penalty confirmed		
VAR events are available from the 2020-2021 season.
Update Frequency : This endpoint is updated every 15 seconds.

Recommended Calls : 1 call per minute for the fixtures in progress otherwise 1 call per day.

You can also retrieve all the events of the fixtures in progress with to the endpoint fixtures?live=all

Here is an example of what can be achieved

demo-events

query Parameters
fixture
required
integer
The id of the fixture

team	
integer
The id of the team

player	
integer
The id of the player

type	
string
The type

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/events

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available events from one {fixture}
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662");

// Get all available events from one {fixture} & {team}
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662&team=463");

// Get all available events from one {fixture} & {player}
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662&player=35845");

// Get all available events from one {fixture} & {type}
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662&type=card");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662&player=35845&type=card");
get("https://v3.football.api-sports.io/fixtures/events?fixture=215662&team=463&type=goal&player=35845");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "fixtures/events",
"parameters": {
"fixture": "215662"
},
"errors": [ ],
"results": 18,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"time": {
"elapsed": 25,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6126,
"name": "F. Andrada"
},
"assist": {
"id": null,
"name": null
},
"type": "Goal",
"detail": "Normal Goal",
"comments": null
},
{
"time": {
"elapsed": 33,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5936,
"name": "Julio González"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 33,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6126,
"name": "Federico Andrada"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 36,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5931,
"name": "Diego Rodríguez"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 39,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5954,
"name": "Fernando Márquez"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 44,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6262,
"name": "Emanuel Iñiguez"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 46,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 35695,
"name": "D. Rodríguez"
},
"assist": {
"id": 5947,
"name": "B. Merlini"
},
"type": "subst",
"detail": "Substitution 1",
"comments": null
},
{
"time": {
"elapsed": 62,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6093,
"name": "Gonzalo Verón"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 73,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5942,
"name": "A. Castro"
},
"assist": {
"id": 6059,
"name": "G. Mainero"
},
"type": "subst",
"detail": "Substitution 2",
"comments": null
},
{
"time": {
"elapsed": 74,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6561,
"name": "N. Solís"
},
"assist": {
"id": 35845,
"name": "H. Burbano"
},
"type": "subst",
"detail": "Substitution 1",
"comments": null
},
{
"time": {
"elapsed": 75,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6093,
"name": "G. Verón"
},
"assist": {
"id": 6396,
"name": "N. Bazzana"
},
"type": "subst",
"detail": "Substitution 2",
"comments": null
},
{
"time": {
"elapsed": 79,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 6474,
"name": "G. Gil"
},
"assist": {
"id": 6550,
"name": "F. Grahl"
},
"type": "subst",
"detail": "Substitution 3",
"comments": null
},
{
"time": {
"elapsed": 79,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5936,
"name": "J. González"
},
"assist": {
"id": 70767,
"name": "B. Ojeda"
},
"type": "subst",
"detail": "Substitution 3",
"comments": null
},
{
"time": {
"elapsed": 84,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 6540,
"name": "Juan Rodriguez"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 85,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 35845,
"name": "Hernán Burbano"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 90,
"extra": null
},
"team": {
"id": 442,
"name": "Defensa Y Justicia",
"logo": "https://media.api-sports.io/football/teams/442.png"
},
"player": {
"id": 5912,
"name": "Neri Cardozo"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
},
{
"time": {
"elapsed": 90,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 35845,
"name": "Hernán Burbano"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Red Card",
"comments": null
},
{
"time": {
"elapsed": 90,
"extra": null
},
"team": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
},
"player": {
"id": 35845,
"name": "Hernán Burbano"
},
"assist": {
"id": null,
"name": null
},
"type": "Card",
"detail": "Yellow Card",
"comments": null
}
]
}
Lineups
Get the lineups for a fixture.

Lineups are available between 20 and 40 minutes before the fixture when the competition covers this feature. You can check this with the endpoint leagues and the coverage field.

It's possible that for some competitions the lineups are not available before the fixture, in this case, they are updated and available after the match with a variable delay depending on the competition.

Available datas

Formation
Coach
Start XI
Substitutes
Players' positions on the grid *

X = row and Y = column (X:Y)

Line 1 X being the one of the goal and then for each line this number is incremented. The column Y will go from left to right, and incremented for each player of the line.

* As a new feature, some irregularities may occur, do not hesitate to report them on our public Roadmap

Update Frequency : This endpoint is updated every 15 minutes.

Recommended Calls : 1 call every 15 minutes for the fixtures in progress otherwise 1 call per day.

Here are several examples of what can be done

demo-lineups

demo-lineups

query Parameters
fixture
required
integer
The id of the fixture

team	
integer
The id of the team

player	
integer
The id of the player

type	
string
The type

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/lineups

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available lineups from one {fixture}
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=592872");

// Get all available lineups from one {fixture} & {team}
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=592872&team=50");

// Get all available lineups from one {fixture} & {player}
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=215662&player=35845");

// Get all available lineups from one {fixture} & {type}
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=215662&type=startXI");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=215662&player=35845&type=startXI");
get("https://v3.football.api-sports.io/fixtures/lineups?fixture=215662&team=463&type=startXI&player=35845");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "fixtures/lineups",
"parameters": {
"fixture": "592872"
},
"errors": [ ],
"results": 2,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 50,
"name": "Manchester City",
"logo": "https://media.api-sports.io/football/teams/50.png",
"colors": {
"player": {
"primary": "5badff",
"number": "ffffff",
"border": "99ff99"
},
"goalkeeper": {
"primary": "99ff99",
"number": "000000",
"border": "99ff99"
}
}
},
"formation": "4-3-3",
"startXI": [
{
"player": {
"id": 617,
"name": "Ederson",
"number": 31,
"pos": "G",
"grid": "1:1"
}
},
{
"player": {
"id": 627,
"name": "Kyle Walker",
"number": 2,
"pos": "D",
"grid": "2:4"
}
},
{
"player": {
"id": 626,
"name": "John Stones",
"number": 5,
"pos": "D",
"grid": "2:3"
}
},
{
"player": {
"id": 567,
"name": "Rúben Dias",
"number": 3,
"pos": "D",
"grid": "2:2"
}
},
{
"player": {
"id": 641,
"name": "Oleksandr Zinchenko",
"number": 11,
"pos": "D",
"grid": "2:1"
}
},
{
"player": {
"id": 629,
"name": "Kevin De Bruyne",
"number": 17,
"pos": "M",
"grid": "3:3"
}
},
{
"player": {
"id": 640,
"name": "Fernandinho",
"number": 25,
"pos": "M",
"grid": "3:2"
}
},
{
"player": {
"id": 631,
"name": "Phil Foden",
"number": 47,
"pos": "M",
"grid": "3:1"
}
},
{
"player": {
"id": 635,
"name": "Riyad Mahrez",
"number": 26,
"pos": "F",
"grid": "4:3"
}
},
{
"player": {
"id": 643,
"name": "Gabriel Jesus",
"number": 9,
"pos": "F",
"grid": "4:2"
}
},
{
"player": {
"id": 645,
"name": "Raheem Sterling",
"number": 7,
"pos": "F",
"grid": "4:1"
}
}
],
"substitutes": [
{
"player": {
"id": 50828,
"name": "Zack Steffen",
"number": 13,
"pos": "G",
"grid": null
}
},
{
"player": {
"id": 623,
"name": "Benjamin Mendy",
"number": 22,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 18861,
"name": "Nathan Aké",
"number": 6,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 622,
"name": "Aymeric Laporte",
"number": 14,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 633,
"name": "İlkay Gündoğan",
"number": 8,
"pos": "M",
"grid": null
}
},
{
"player": {
"id": 44,
"name": "Rodri",
"number": 16,
"pos": "M",
"grid": null
}
},
{
"player": {
"id": 931,
"name": "Ferrán Torres",
"number": 21,
"pos": "F",
"grid": null
}
},
{
"player": {
"id": 636,
"name": "Bernardo Silva",
"number": 20,
"pos": "M",
"grid": null
}
},
{
"player": {
"id": 642,
"name": "Sergio Agüero",
"number": 10,
"pos": "F",
"grid": null
}
}
],
"coach": {
"id": 4,
"name": "Guardiola",
"photo": "https://media.api-sports.io/football/coachs/4.png"
}
},
{
"team": {
"id": 45,
"name": "Everton",
"logo": "https://media.api-sports.io/football/teams/45.png",
"colors": {
"player": {
"primary": "070707",
"number": "ffffff",
"border": "66ff00"
},
"goalkeeper": {
"primary": "66ff00",
"number": "000000",
"border": "66ff00"
}
}
},
"formation": "4-3-1-2",
"startXI": [
{
"player": {
"id": 2932,
"name": "Jordan Pickford",
"number": 1,
"pos": "G",
"grid": "1:1"
}
},
{
"player": {
"id": 19150,
"name": "Mason Holgate",
"number": 4,
"pos": "D",
"grid": "2:4"
}
},
{
"player": {
"id": 2934,
"name": "Michael Keane",
"number": 5,
"pos": "D",
"grid": "2:3"
}
},
{
"player": {
"id": 19073,
"name": "Ben Godfrey",
"number": 22,
"pos": "D",
"grid": "2:2"
}
},
{
"player": {
"id": 2724,
"name": "Lucas Digne",
"number": 12,
"pos": "D",
"grid": "2:1"
}
},
{
"player": {
"id": 18805,
"name": "Abdoulaye Doucouré",
"number": 16,
"pos": "M",
"grid": "3:3"
}
},
{
"player": {
"id": 326,
"name": "Allan",
"number": 6,
"pos": "M",
"grid": "3:2"
}
},
{
"player": {
"id": 18762,
"name": "Tom Davies",
"number": 26,
"pos": "M",
"grid": "3:1"
}
},
{
"player": {
"id": 2795,
"name": "Gylfi Sigurðsson",
"number": 10,
"pos": "M",
"grid": "4:1"
}
},
{
"player": {
"id": 18766,
"name": "Dominic Calvert-Lewin",
"number": 9,
"pos": "F",
"grid": "5:2"
}
},
{
"player": {
"id": 2413,
"name": "Richarlison",
"number": 7,
"pos": "F",
"grid": "5:1"
}
}
],
"substitutes": [
{
"player": {
"id": 18755,
"name": "João Virgínia",
"number": 31,
"pos": "G",
"grid": null
}
},
{
"player": {
"id": 766,
"name": "Robin Olsen",
"number": 33,
"pos": "G",
"grid": null
}
},
{
"player": {
"id": 156490,
"name": "Niels Nkounkou",
"number": 18,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 18758,
"name": "Séamus Coleman",
"number": 23,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 138849,
"name": "Kyle John",
"number": 48,
"pos": "D",
"grid": null
}
},
{
"player": {
"id": 18765,
"name": "André Gomes",
"number": 21,
"pos": "M",
"grid": null
}
},
{
"player": {
"id": 1455,
"name": "Alex Iwobi",
"number": 17,
"pos": "F",
"grid": null
}
},
{
"player": {
"id": 18761,
"name": "Bernard",
"number": 20,
"pos": "F",
"grid": null
}
}
],
"coach": {
"id": 2407,
"name": "C. Ancelotti",
"photo": "https://media.api-sports.io/football/coachs/2407.png"
}
}
]
}
Players statistics
Get the players statistics from one fixture.

Update Frequency : This endpoint is updated every minute.

Recommended Calls : 1 call every minute for the fixtures in progress otherwise 1 call per day.

query Parameters
fixture
required
integer
The id of the fixture

team	
integer
The id of the team

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/fixtures/players

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available players statistics from one {fixture}
get("https://v3.football.api-sports.io/fixtures/players?fixture=169080");

// Get all available players statistics from one {fixture} & {team}
get("https://v3.football.api-sports.io/fixtures/players?fixture=169080&team=2284");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "fixtures/players",
"parameters": {
"fixture": "169080"
},
"errors": [ ],
"results": 2,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 2284,
"name": "Monarcas",
"logo": "https://media.api-sports.io/football/teams/2284.png",
"update": "2020-01-13T16:12:12+00:00"
},
"players": [
{
"player": {
"id": 35931,
"name": "Sebastián Sosa",
"photo": "https://media.api-sports.io/football/players/35931.png"
},
"statistics": [
{
"games": {
"minutes": 90,
"number": 13,
"position": "G",
"rating": "6.3",
"captain": false,
"substitute": false
},
"offsides": null,
"shots": {
"total": 0,
"on": 0
},
"goals": {
"total": null,
"conceded": 1,
"assists": null,
"saves": 0
},
"passes": {
"total": 17,
"key": 0,
"accuracy": "68%"
},
"tackles": {
"total": null,
"blocks": 0,
"interceptions": 0
},
"duels": {
"total": null,
"won": null
},
"dribbles": {
"attempts": 0,
"success": 0,
"past": null
},
"fouls": {
"drawn": 0,
"committed": 0
},
"cards": {
"yellow": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": 0
}
}
]
}
]
}
]
}
Injuries
Injuries
Get the list of players not participating in the fixtures for various reasons such as suspended, injured for example.

Being a new endpoint, the data is only available from April 2021.

There are two types:

Missing Fixture : The player will not play the fixture.
Questionable : The information is not yet 100% sure, the player may eventually play the fixture.
Examples available in Request samples "Use Cases".

All the parameters of this endpoint can be used together.

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated every 4 hours.

Recommended Calls : 1 call per day.

query Parameters
league	
integer
The id of the league

season	
integer = 4 characters YYYY
The season of the league, required with league, team and player parameters

fixture	
integer
The id of the fixture

team	
integer
The id of the team

player	
integer
The id of the player

date	
stringYYYY-MM-DD
A valid date

ids	
stringMaximum of 20 fixtures ids
Value: "id-id-id"
One or more fixture ids

timezone	
string
A valid timezone from the endpoint Timezone

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/injuries

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available injuries from one {league} & {season}
get("https://v3.football.api-sports.io/injuries?league=2&season=2020");

// Get all available injuries from one {fixture}
get("https://v3.football.api-sports.io/injuries?fixture=686314");

// Get all available injuries from severals fixtures {ids} 
get("https://v3.football.api-sports.io/injuries?ids=686314-686315-686316-686317-686318-686319-686320");

// Get all available injuries from one {team} & {season}
get("https://v3.football.api-sports.io/injuries?team=85&season=2020");

// Get all available injuries from one {player} & {season}
get("https://v3.football.api-sports.io/injuries?player=865&season=2020");

// Get all available injuries from one {date}
get("https://v3.football.api-sports.io/injuries?date=2021-04-07");

// It’s possible to make requests by mixing the available parameters
get("https://v3.football.api-sports.io/injuries?league=2&season=2020&team=85");
get("https://v3.football.api-sports.io/injuries?league=2&season=2020&player=865");
get("https://v3.football.api-sports.io/injuries?date=2021-04-07&timezone=Europe/London&team=85");
get("https://v3.football.api-sports.io/injuries?date=2021-04-07&league=61");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "injuries",
"parameters": {
"fixture": "686314"
},
"errors": [ ],
"results": 13,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"player": {
"id": 865,
"name": "D. Costa",
"photo": "https://media.api-sports.io/football/players/865.png",
"type": "Missing Fixture",
"reason": "Broken ankle"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 510,
"name": "S. Gnabry",
"photo": "https://media.api-sports.io/football/players/510.png",
"type": "Missing Fixture",
"reason": "Illness"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 496,
"name": "R. Hoffmann",
"photo": "https://media.api-sports.io/football/players/496.png",
"type": "Missing Fixture",
"reason": "Knee Injury"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 521,
"name": "R. Lewandowski",
"photo": "https://media.api-sports.io/football/players/521.png",
"type": "Missing Fixture",
"reason": "Knee Injury"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 514,
"name": "J. Martinez",
"photo": "https://media.api-sports.io/football/players/514.png",
"type": "Missing Fixture",
"reason": "Knock"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 162037,
"name": "M. Tillman",
"photo": "https://media.api-sports.io/football/players/162037.png",
"type": "Missing Fixture",
"reason": "Knee Injury"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 519,
"name": "C. Tolisso",
"photo": "https://media.api-sports.io/football/players/519.png",
"type": "Missing Fixture",
"reason": "Tendon Injury"
},
"team": {
"id": 157,
"name": "Bayern Munich",
"logo": "https://media.api-sports.io/football/teams/157.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 258,
"name": "J. Bernat",
"photo": "https://media.api-sports.io/football/players/258.png",
"type": "Missing Fixture",
"reason": "Knee Injury"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 769,
"name": "A. Florenzi",
"photo": "https://media.api-sports.io/football/players/769.png",
"type": "Missing Fixture",
"reason": "Illness"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 216,
"name": "M. Icardi",
"photo": "https://media.api-sports.io/football/players/216.png",
"type": "Missing Fixture",
"reason": "Muscle Injury"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 263,
"name": "L. Kurzawa",
"photo": "https://media.api-sports.io/football/players/263.png",
"type": "Missing Fixture",
"reason": "Calf Injury"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 271,
"name": "L. Paredes",
"photo": "https://media.api-sports.io/football/players/271.png",
"type": "Missing Fixture",
"reason": "Suspended"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
},
{
"player": {
"id": 273,
"name": "M. Verratti",
"photo": "https://media.api-sports.io/football/players/273.png",
"type": "Missing Fixture",
"reason": "Illness"
},
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"fixture": {
"id": 686314,
"timezone": "UTC",
"date": "2021-04-07T19:00:00+00:00",
"timestamp": 1617822000
},
"league": {
"id": 2,
"season": 2020,
"name": "UEFA Champions League",
"country": "World",
"logo": "https://media.api-sports.io/football/leagues/2.png",
"flag": null
}
}
]
}
Predictions
Predictions
Get predictions about a fixture.

The predictions are made using several algorithms including the poisson distribution, comparison of team statistics, last matches, players etc…

Bookmakers odds are not used to make these predictions

Also provides some comparative statistics between teams

Available Predictions

Match winner : Id of the team that can potentially win the fixture
Win or Draw : If True indicates that the designated team can win or draw
Under / Over : -1.5 / -2.5 / -3.5 / -4.5 / +1.5 / +2.5 / +3.5 / +4.5 *
Goals Home : -1.5 / -2.5 / -3.5 / -4.5 *
Goals Away -1.5 / -2.5 / -3.5 / -4.5 *
Advice (Ex : Deportivo Santani or draws and -3.5 goals)
* -1.5 means that there will be a maximum of 1.5 goals in the fixture, i.e : 1 goal

Update Frequency : This endpoint is updated every hour.

Recommended Calls : 1 call per hour for the fixtures in progress otherwise 1 call per day.

Here is an example of what can be achieved

demo-prediction

query Parameters
fixture
required
integer
The id of the fixture

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/predictions

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all available predictions from one {fixture}
get("https://v3.football.api-sports.io/predictions?fixture=198772");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "predictions",
"parameters": {
"fixture": "198772"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"predictions": {
"winner": {
"id": 1189,
"name": "Deportivo Santani",
"comment": "Win or draw"
},
"win_or_draw": true,
"under_over": "-3.5",
"goals": {
"home": "-2.5",
"away": "-1.5"
},
"advice": "Combo Double chance : Deportivo Santani or draw and -3.5 goals",
"percent": {
"home": "45%",
"draw": "45%",
"away": "10%"
}
},
"league": {
"id": 252,
"name": "Primera Division - Clausura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/252.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2019
},
"teams": {
"home": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"last_5": {
"form": "60%",
"att": "60%",
"def": "0%",
"goals": {
"for": {
"total": 3,
"average": 0.6
},
"against": {
"total": 5,
"average": 1
}
}
},
"league": {
"form": "LDLDLDLWLWWLW",
"fixtures": {
"played": {
"home": 6,
"away": 7,
"total": 13
},
"wins": {
"home": 2,
"away": 2,
"total": 4
},
"draws": {
"home": 3,
"away": 0,
"total": 3
},
"loses": {
"home": 1,
"away": 5,
"total": 6
}
},
"goals": {
"for": {
"total": {
"home": 7,
"away": 4,
"total": 11
},
"average": {
"home": "1.2",
"away": "0.6",
"total": "0.8"
}
},
"against": {
"total": {
"home": 6,
"away": 14,
"total": 20
},
"average": {
"home": "1.0",
"away": "2.0",
"total": "1.5"
}
}
},
"biggest": {
"streak": {
"wins": 2,
"draws": 1,
"loses": 1
},
"wins": {
"home": "3-1",
"away": "0-1"
},
"loses": {
"home": "0-2",
"away": "4-0"
},
"goals": {
"for": {
"home": 3,
"away": 1
},
"against": {
"home": 2,
"away": 4
}
}
},
"clean_sheet": {
"home": 1,
"away": 2,
"total": 3
},
"failed_to_score": {
"home": 1,
"away": 3,
"total": 4
}
}
},
"away": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"last_5": {
"form": "40%",
"att": "80%",
"def": "0%",
"goals": {
"for": {
"total": 4,
"average": 0.8
},
"against": {
"total": 8,
"average": 1.6
}
}
},
"league": {
"form": "WLWLDLDLLLLWW",
"fixtures": {
"played": {
"home": 7,
"away": 6,
"total": 13
},
"wins": {
"home": 3,
"away": 1,
"total": 4
},
"draws": {
"home": 0,
"away": 2,
"total": 2
},
"loses": {
"home": 4,
"away": 3,
"total": 7
}
},
"goals": {
"for": {
"total": {
"home": 8,
"away": 3,
"total": 11
},
"average": {
"home": "1.1",
"away": "0.5",
"total": "0.8"
}
},
"against": {
"total": {
"home": 14,
"away": 10,
"total": 24
},
"average": {
"home": "2.0",
"away": "1.7",
"total": "1.8"
}
}
},
"biggest": {
"streak": {
"wins": 1,
"draws": 1,
"loses": 4
},
"wins": {
"home": "3-1",
"away": "0-1"
},
"loses": {
"home": "0-6",
"away": "3-0"
},
"goals": {
"for": {
"home": 3,
"away": 1
},
"against": {
"home": 6,
"away": 3
}
}
},
"clean_sheet": {
"home": 1,
"away": 1,
"total": 2
},
"failed_to_score": {
"home": 3,
"away": 3,
"total": 6
}
}
}
},
"comparison": {
"form": {
"home": "60%",
"away": "40%"
},
"att": {
"home": "43%",
"away": "57%"
},
"def": {
"home": "62%",
"away": "38%"
},
"poisson_distribution": {
"home": "75%",
"away": "25%"
},
"h2h": {
"home": "29%",
"away": "71%"
},
"goals": {
"home": "40%",
"away": "60%"
},
"total": {
"home": "51.5%",
"away": "48.5%"
}
},
"h2h": [
{
"fixture": {
"id": 198706,
"referee": "J. Méndez",
"timezone": "UTC",
"date": "2019-07-27T19:30:00+00:00",
"timestamp": 1564255800,
"periods": {
"first": 1564255800,
"second": 1564259400
},
"venue": {
"id": null,
"name": "Estadio Lic. Erico Galeano Segovia (Capiatá)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 252,
"name": "Primera Division - Clausura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/252.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2019,
"round": "Clausura - 3"
},
"teams": {
"home": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": true
},
"away": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": false
}
},
"goals": {
"home": 3,
"away": 1
},
"score": {
"halftime": {
"home": 1,
"away": 1
},
"fulltime": {
"home": 3,
"away": 1
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144182,
"referee": null,
"timezone": "UTC",
"date": "2019-03-25T23:15:00+00:00",
"timestamp": 1553555700,
"periods": {
"first": 1553555700,
"second": 1553559300
},
"venue": {
"id": null,
"name": "Estadio Lic. Erico Galeano Segovia (Capiatá)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 250,
"name": "Primera Division - Apertura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/250.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2019,
"round": "Regular Season - 12"
},
"teams": {
"home": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": true
},
"away": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": false
}
},
"goals": {
"home": 2,
"away": 1
},
"score": {
"halftime": {
"home": 2,
"away": 1
},
"fulltime": {
"home": 2,
"away": 1
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144113,
"referee": null,
"timezone": "UTC",
"date": "2019-01-23T21:00:00+00:00",
"timestamp": 1548277200,
"periods": {
"first": 1548277200,
"second": 1548280800
},
"venue": {
"id": null,
"name": "Estadio Juan José Vázquez (San Estanislao)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 250,
"name": "Primera Division - Apertura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/250.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2019,
"round": "Regular Season - 1"
},
"teams": {
"home": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": null
},
"away": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": null
}
},
"goals": {
"home": 0,
"away": 0
},
"score": {
"halftime": {
"home": 0,
"away": 0
},
"fulltime": {
"home": 0,
"away": 0
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144745,
"referee": null,
"timezone": "UTC",
"date": "2018-11-12T20:45:00+00:00",
"timestamp": 1542055500,
"periods": {
"first": 1542055500,
"second": 1542059100
},
"venue": {
"id": null,
"name": "Estadio Lic. Erico Galeano Segovia (Capiatá)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 252,
"name": "Primera Division - Clausura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/252.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2018,
"round": "Regular Season - 18"
},
"teams": {
"home": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": false
},
"away": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": true
}
},
"goals": {
"home": 0,
"away": 2
},
"score": {
"halftime": {
"home": 0,
"away": 1
},
"fulltime": {
"home": 0,
"away": 2
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144679,
"referee": null,
"timezone": "UTC",
"date": "2018-08-26T19:30:00+00:00",
"timestamp": 1535311800,
"periods": {
"first": 1535311800,
"second": 1535315400
},
"venue": {
"id": null,
"name": "Estadio Juan José Vázquez (San Estanislao)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 252,
"name": "Primera Division - Clausura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/252.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2018,
"round": "Regular Season - 7"
},
"teams": {
"home": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": false
},
"away": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": true
}
},
"goals": {
"home": 0,
"away": 1
},
"score": {
"halftime": {
"home": 0,
"away": 1
},
"fulltime": {
"home": 0,
"away": 1
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144330,
"referee": null,
"timezone": "UTC",
"date": "2018-05-05T21:30:00+00:00",
"timestamp": 1525555800,
"periods": {
"first": 1525555800,
"second": 1525559400
},
"venue": {
"id": null,
"name": "Estadio Juan José Vázquez (San Estanislao)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 250,
"name": "Primera Division - Apertura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/250.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2018,
"round": "Regular Season - 15"
},
"teams": {
"home": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": null
},
"away": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": null
}
},
"goals": {
"home": 3,
"away": 3
},
"score": {
"halftime": {
"home": 2,
"away": 1
},
"fulltime": {
"home": 3,
"away": 3
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
},
{
"fixture": {
"id": 144264,
"referee": null,
"timezone": "UTC",
"date": "2018-02-25T20:45:00+00:00",
"timestamp": 1519591500,
"periods": {
"first": 1519591500,
"second": 1519595100
},
"venue": {
"id": null,
"name": "Estadio Lic. Erico Galeano Segovia (Capiatá)",
"city": null
},
"status": {
"long": "Match Finished",
"short": "FT",
"elapsed": 90,
"extra": null
}
},
"league": {
"id": 250,
"name": "Primera Division - Apertura",
"country": "Paraguay",
"logo": "https://media.api-sports.io/football/leagues/250.png",
"flag": "https://media.api-sports.io/flags/py.svg",
"season": 2018,
"round": "Regular Season - 4"
},
"teams": {
"home": {
"id": 1180,
"name": "Deportivo Capiata",
"logo": "https://media.api-sports.io/football/teams/1180.png",
"winner": true
},
"away": {
"id": 1189,
"name": "Deportivo Santani",
"logo": "https://media.api-sports.io/football/teams/1189.png",
"winner": false
}
},
"goals": {
"home": 2,
"away": 1
},
"score": {
"halftime": {
"home": 1,
"away": 1
},
"fulltime": {
"home": 2,
"away": 1
},
"extratime": {
"home": null,
"away": null
},
"penalty": {
"home": null,
"away": null
}
}
}
]
}
]
}
Coachs
Coachs
Get all the information about the coachs and their careers.

To get the photo of a coach you have to call the following url: https://media.api-sports.io/football/coachs/{coach_id}.png

Update Frequency : This endpoint is updated every day.

Recommended Calls : 1 call per day.

query Parameters
id	
integer
The id of the coach

team	
integer
The id of the team

search	
string >= 3 characters
The name of the coach

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/coachs

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get coachs from one coach {id}
get("https://v3.football.api-sports.io/coachs?id=1");

// Get coachs from one {team}
get("https://v3.football.api-sports.io/coachs?team=33");

// Allows you to search for a coach in relation to a coach {name}
get("https://v3.football.api-sports.io/coachs?search=Klopp");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "coachs",
"parameters": {
"team": "85"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"id": 40,
"name": "T. Tuchel",
"firstname": "Thomas",
"lastname": "Tuchel",
"age": 47,
"birth": {
"date": "1973-08-29",
"place": "Krumbach",
"country": "Germany"
},
"nationality": "Germany",
"height": "192 cm",
"weight": "85 kg",
"photo": "https://media.api-sports.io/football/coachs/40.png",
"team": {
"id": 85,
"name": "PSG",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"career": [
{
"team": {
"id": 85,
"name": "PSG",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"start": "2018-07-01",
"end": null
},
{
"team": {
"id": 165,
"name": "Borussia Dortmund",
"logo": "https://media.api-sports.io/football/teams/165.png"
},
"start": "2015-07-01",
"end": "2017-05-01"
},
{
"team": {
"id": 164,
"name": "Mainz 05",
"logo": "https://media.api-sports.io/football/teams/164.png"
},
"start": "2009-08-01",
"end": "2014-05-01"
}
]
}
]
}
Players
Seasons
Get all available seasons for players statistics.

Update Frequency : This endpoint is updated every day.

Recommended Calls : 1 call per day.

query Parameters
player	
integer
The id of the player

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/seasons

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all seasons available for players endpoint
get("https://v3.football.api-sports.io/players/seasons");

// Get all seasons available for a player {id}
get("https://v3.football.api-sports.io/players/seasons?player=276");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/seasons",
"parameters": [ ],
"errors": [ ],
"results": 35,
"paging": {
"current": 1,
"total": 1
},
"response": [
1966,
1982,
1986,
1990,
1991,
1992,
1993,
1994,
1995,
1996,
1997,
1998,
1999,
2000,
2001,
2002,
2003,
2004,
2005,
2006,
2007,
2008,
2009,
2010,
2011,
2012,
2013,
2014,
2015,
2016,
2017,
2018,
2019,
2020,
2022
]
}
Profiles
Returns the list of all available players.

It is possible to call this endpoint without parameters, but you will need to use the pagination to get all available players.

To get the photo of a player you have to call the following url: https://media.api-sports.io/football/players/{player_id}.png

This endpoint uses a pagination system, you can navigate between the different pages with to the page parameter.

Pagination : 250 results per page.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per week.

query Parameters
player	
integer
The id of the player

search	
string >= 3 characters
The lastname of the player

page	
integer
Default: 1
Use for the pagination

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/profiles

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get data from one {player}
get("https://v3.football.api-sports.io/players/profiles?player=276");

// Allows you to search for a player in relation to a player {lastname}
get("https://v3.football.api-sports.io/players/profiles?search=ney");

// Get all available Players (limited to 250 results, use the pagination for next ones)
get("https://v3.football.api-sports.io/players/profiles");
get("https://v3.football.api-sports.io/players/profiles?page=2");
get("https://v3.football.api-sports.io/players/profiles?page=3");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/profiles",
"parameters": {
"player": "276"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"player": {
"id": 276,
"name": "Neymar",
"firstname": "Neymar",
"lastname": "da Silva Santos Júnior",
"age": 32,
"birth": {
"date": "1992-02-05",
"place": "Mogi das Cruzes",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "175 cm",
"weight": "68 kg",
"number": 10,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/276.png"
}
}
]
}
Statistics
Get players statistics.

This endpoint returns the players for whom the profile and statistics data are available. Note that it is possible that a player has statistics for 2 teams in the same season in case of transfers.

The statistics are calculated according to the team id, league id and season.

You can find the available seasons by using the endpoint players/seasons.

To get the squads of the teams it is better to use the endpoint players/squads.

The players id are unique in the API and players keep it among all the teams they have been in.

In this endpoint you have the rating field, which is the rating of the player according to a match or a season. This data is calculated according to the performance of the player in relation to the other players of the game or the season who occupy the same position (Attacker, defender, goal...). There are different algorithms that take into account the position of the player and assign points according to his performance.

To get the photo of a player you have to call the following url: https://media.api-sports.io/football/players/{player_id}.png

This endpoint uses a pagination system, you can navigate between the different pages with to the page parameter.

Pagination : 20 results per page.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

Tutorials :

HOW TO GET ALL TEAMS AND PLAYERS FROM A LEAGUE ID
query Parameters
id	
integer
The id of the player

team	
integer
The id of the team

league	
integer
The id of the league

season	
integer = 4 characters YYYY | Requires the fields Id, League or Team...
The season of the league

search	
string >= 4 characters Requires the fields League or Team
The name of the player

page	
integer
Default: 1
Use for the pagination

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all players statistics from one player {id} & {season}
get("https://v3.football.api-sports.io/players?id=19088&season=2018");

// Get all players statistics from one {team} & {season}
get("https://v3.football.api-sports.io/players?season=2018&team=33");
get("https://v3.football.api-sports.io/players?season=2018&team=33&page=2");

// Get all players statistics from one {league} & {season}
get("https://v3.football.api-sports.io/players?season=2018&league=61");
get("https://v3.football.api-sports.io/players?season=2018&league=61&page=4");

// Get all players statistics from one {league}, {team} & {season}
get("https://v3.football.api-sports.io/players?season=2018&league=61&team=33");
get("https://v3.football.api-sports.io/players?season=2018&league=61&team=33&page=5");

// Allows you to search for a player in relation to a player {name}
get("https://v3.football.api-sports.io/players?team=85&search=cavani");
get("https://v3.football.api-sports.io/players?league=61&search=cavani");
get("https://v3.football.api-sports.io/players?team=85&search=cavani&season=2018");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players",
"parameters": {
"id": "276",
"season": "2019"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"player": {
"id": 276,
"name": "Neymar",
"firstname": "Neymar",
"lastname": "da Silva Santos Júnior",
"age": 28,
"birth": {
"date": "1992-02-05",
"place": "Mogi das Cruzes",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "175 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/276.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2019
},
"games": {
"appearences": 15,
"lineups": 15,
"minutes": 1322,
"number": null,
"position": "Attacker",
"rating": "8.053333",
"captain": false
},
"substitutes": {
"in": 0,
"out": 3,
"bench": 0
},
"shots": {
"total": 70,
"on": 36
},
"goals": {
"total": 13,
"conceded": null,
"assists": 6,
"saves": 0
},
"passes": {
"total": 704,
"key": 39,
"accuracy": 79
},
"tackles": {
"total": 13,
"blocks": 0,
"interceptions": 4
},
"duels": {
"total": null,
"won": null
},
"dribbles": {
"attempts": 143,
"success": 88,
"past": null
},
"fouls": {
"drawn": 62,
"committed": 14
},
"cards": {
"yellow": 3,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": 1,
"commited": null,
"scored": 4,
"missed": 1,
"saved": null
}
}
]
}
]
}
Squads
Return the current squad of a team when the team parameter is used. When the player parameter is used the endpoint returns the set of teams associated with the player.

The response format is the same regardless of the parameter sent.

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per week.

query Parameters
team	
integer
The id of the team

player	
integer
The id of the player

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/squads

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all players from one {team}
get("https://v3.football.api-sports.io/players/squads?team=33");

// Get all teams from one {player}
get("https://v3.football.api-sports.io/players/squads?player=276");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/squads",
"parameters": {
"team": "33"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 33,
"name": "Manchester United",
"logo": "https://media.api-sports.io/football/teams/33.png"
},
"players": [
{
"id": 20319,
"name": "N. Bishop",
"age": 22,
"number": 30,
"position": "Goalkeeper",
"photo": "https://media.api-sports.io/football/players/20319.png"
},
{
"id": 882,
"name": "David de Gea",
"age": 31,
"number": 1,
"position": "Goalkeeper",
"photo": "https://media.api-sports.io/football/players/882.png"
},
{
"id": 883,
"name": "L. Grant",
"age": 38,
"number": 13,
"position": "Goalkeeper",
"photo": "https://media.api-sports.io/football/players/883.png"
},
{
"id": 2931,
"name": "T. Heaton",
"age": 35,
"number": null,
"position": "Goalkeeper",
"photo": "https://media.api-sports.io/football/players/2931.png"
},
{
"id": 19088,
"name": "D. Henderson",
"age": 24,
"number": 26,
"position": "Goalkeeper",
"photo": "https://media.api-sports.io/football/players/19088.png"
},
{
"id": 885,
"name": "E. Bailly",
"age": 27,
"number": 3,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/885.png"
},
{
"id": 886,
"name": "Diogo Dalot",
"age": 22,
"number": 20,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/886.png"
},
{
"id": 153434,
"name": "W. Fish",
"age": 18,
"number": 48,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/153434.png"
},
{
"id": 888,
"name": "P. Jones",
"age": 29,
"number": 4,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/888.png"
},
{
"id": 138775,
"name": "E. Laird",
"age": 20,
"number": null,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/138775.png"
},
{
"id": 2935,
"name": "H. Maguire",
"age": 28,
"number": 5,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/2935.png"
},
{
"id": 889,
"name": "V. Lindelöf",
"age": 27,
"number": 2,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/889.png"
},
{
"id": 891,
"name": "L. Shaw",
"age": 26,
"number": 23,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/891.png"
},
{
"id": 378,
"name": "Alex Telles",
"age": 29,
"number": 27,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/378.png"
},
{
"id": 19182,
"name": "A. Tuanzebe",
"age": 24,
"number": 38,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/19182.png"
},
{
"id": 18846,
"name": "A. Wan-Bissaka",
"age": 24,
"number": 29,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/18846.png"
},
{
"id": 138806,
"name": "B. Williams",
"age": 21,
"number": 33,
"position": "Defender",
"photo": "https://media.api-sports.io/football/players/138806.png"
},
{
"id": 1485,
"name": "Bruno Fernandes",
"age": 27,
"number": 18,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/1485.png"
},
{
"id": 906,
"name": "T. Chong",
"age": 22,
"number": 44,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/906.png"
},
{
"id": 895,
"name": "J. Garner",
"age": 20,
"number": null,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/895.png"
},
{
"id": 899,
"name": "Andreas Pereira",
"age": 25,
"number": 15,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/899.png"
},
{
"id": 900,
"name": "J. Lingard",
"age": 29,
"number": 14,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/900.png"
},
{
"id": 901,
"name": "Mata",
"age": 33,
"number": 8,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/901.png"
},
{
"id": 902,
"name": "N. Matić",
"age": 33,
"number": 31,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/902.png"
},
{
"id": 903,
"name": "S. McTominay",
"age": 25,
"number": 39,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/903.png"
},
{
"id": 180560,
"name": "H. Mejbri",
"age": 18,
"number": 46,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/180560.png"
},
{
"id": 904,
"name": "P. Pogba",
"age": 28,
"number": 6,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/904.png"
},
{
"id": 905,
"name": "Fred",
"age": 28,
"number": 17,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/905.png"
},
{
"id": 163054,
"name": "S. Shoretire",
"age": 17,
"number": 74,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/163054.png"
},
{
"id": 547,
"name": "D. van de Beek",
"age": 24,
"number": 34,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/547.png"
},
{
"id": 138814,
"name": "E. Galbraith",
"age": 20,
"number": null,
"position": "Midfielder",
"photo": "https://media.api-sports.io/football/players/138814.png"
},
{
"id": 274,
"name": "E. Cavani",
"age": 34,
"number": 7,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/274.png"
},
{
"id": 153430,
"name": "A. Elanga",
"age": 19,
"number": 56,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/153430.png"
},
{
"id": 897,
"name": "M. Greenwood",
"age": 20,
"number": 11,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/897.png"
},
{
"id": 19329,
"name": "D. James",
"age": 24,
"number": 21,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/19329.png"
},
{
"id": 908,
"name": "A. Martial",
"age": 26,
"number": 9,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/908.png"
},
{
"id": 909,
"name": "M. Rashford",
"age": 24,
"number": 10,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/909.png"
},
{
"id": 157997,
"name": "A. Diallo",
"age": 19,
"number": 19,
"position": "Attacker",
"photo": "https://media.api-sports.io/football/players/157997.png"
}
]
}
]
}
Teams
Returns the list of teams and seasons in which the player played during his career.

This endpoint requires at least one parameter.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per week.

query Parameters
player
required
integer
The id of the player

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/teams

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all teams from one {player}
get("https://v3.football.api-sports.io/players/teams?player=276");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/teams",
"parameters": {
"player": "276"
},
"errors": [ ],
"results": 8,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"team": {
"id": 6,
"name": "Brazil",
"logo": "https://media.api-sports.io/football/teams/6.png"
},
"seasons": [
2026,
2023,
2022,
2021,
2019,
2018,
2017,
2016,
2015,
2014,
2013,
2012,
2011,
2010
]
},
{
"team": {
"id": 2932,
"name": "Al-Hilal Saudi FC",
"logo": "https://media.api-sports.io/football/teams/2932.png"
},
"seasons": [
2024,
2023
]
},
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"seasons": [
2022,
2021,
2020,
2019,
2018,
2017
]
},
{
"team": {
"id": 529,
"name": "Barcelona",
"logo": "https://media.api-sports.io/football/teams/529.png"
},
"seasons": [
2016,
2015,
2014,
2013
]
},
{
"team": {
"id": 10171,
"name": "Brazil  U23",
"logo": "https://media.api-sports.io/football/teams/10171.png"
},
"seasons": [
2016,
2012
]
},
{
"team": {
"id": 128,
"name": "Santos",
"logo": "https://media.api-sports.io/football/teams/128.png"
},
"seasons": [
2012,
2011,
2010,
2009
]
},
{
"team": {
"id": 16200,
"name": "Brazil U20",
"logo": "https://media.api-sports.io/football/teams/16200.png"
},
"seasons": [
2011
]
},
{
"team": {
"id": 12502,
"name": "Brazil U17",
"logo": "https://media.api-sports.io/football/teams/12502.png"
},
"seasons": [
2009
]
}
]
}
Top Scorers
Get the 20 best players for a league or cup.

How it is calculated:

1 : The player that has scored the higher number of goals
2 : The player that has scored the fewer number of penalties
3 : The player that has delivered the higher number of goal assists
4 : The player that scored their goals in the higher number of matches
5 : The player that played the fewer minutes
6 : The player that plays for the team placed higher on the table
7 : The player that received the fewer number of red cards
8 : The player that received the fewer number of yellow cards
Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/topscorers

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topscorers');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
	'season' => '2018',
	'league' => '61'
)));

$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/topscorers",
"parameters": {
"league": "61",
"season": "2018"
},
"errors": [ ],
"results": 20,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"player": {
"id": 278,
"name": "K. Mbappé",
"firstname": "Kylian",
"lastname": "Mbappé Lottin",
"age": 22,
"birth": {
"date": "1998-12-20",
"place": "Paris",
"country": "France"
},
"nationality": "France",
"height": "178 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/278.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2018
},
"games": {
"appearences": 29,
"lineups": 24,
"minutes": 2340,
"number": null,
"position": "Attacker",
"rating": "7.871428",
"captain": false
},
"substitutes": {
"in": 5,
"out": 1,
"bench": 5
},
"shots": {
"total": 122,
"on": 68
},
"goals": {
"total": 33,
"conceded": null,
"assists": 7,
"saves": 0
},
"passes": {
"total": 591,
"key": 48,
"accuracy": 78
},
"tackles": {
"total": 4,
"blocks": 0,
"interceptions": 4
},
"duels": {
"total": 232,
"won": 112
},
"dribbles": {
"attempts": 115,
"success": 64,
"past": null
},
"fouls": {
"drawn": 39,
"committed": 19
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": 3,
"commited": null,
"scored": 1,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 3246,
"name": "N. Pépé",
"firstname": "Nicolas",
"lastname": "Pépé",
"age": 25,
"birth": {
"date": "1995-05-29",
"place": "Mantes-la-Jolie",
"country": "France"
},
"nationality": "Côte d'Ivoire",
"height": "178 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/3246.png"
},
"statistics": [
{
"team": {
"id": 79,
"name": "Lille",
"logo": "https://media.api-sports.io/football/teams/79.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2018
},
"games": {
"appearences": 38,
"lineups": 37,
"minutes": 3332,
"number": null,
"position": "Attacker",
"rating": "7.281578",
"captain": false
},
"substitutes": {
"in": 1,
"out": 9,
"bench": 1
},
"shots": {
"total": 118,
"on": 61
},
"goals": {
"total": 22,
"conceded": null,
"assists": 11,
"saves": 0
},
"passes": {
"total": 946,
"key": 70,
"accuracy": 78
},
"tackles": {
"total": 9,
"blocks": 0,
"interceptions": 12
},
"duels": {
"total": 556,
"won": 279
},
"dribbles": {
"attempts": 182,
"success": 102,
"past": null
},
"fouls": {
"drawn": 108,
"committed": 24
},
"cards": {
"yellow": 1,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": 5,
"commited": null,
"scored": 9,
"missed": 1,
"saved": null
}
}
]
}
]
}
Top Assists
Get the 20 best players assists for a league or cup.

How it is calculated:

1 : The player that has delivered the higher number of goal assists
2 : The player that has scored the higher number of goals
3 : The player that has scored the fewer number of penalties
4 : The player that assists in the higher number of matches
5 : The player that played the fewer minutes
6 : The player that received the fewer number of red cards
7 : The player that received the fewer number of yellow cards
Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/topassists

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topassists');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
	'season' => '2020',
	'league' => '61'
)));

$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/topassists",
"parameters": {
"season": "2020",
"league": "61"
},
"errors": [ ],
"results": 20,
"paging": {
"current": 0,
"total": 1
},
"response": [
{
"player": {
"id": 667,
"name": "M. Depay",
"firstname": "Memphis",
"lastname": "Depay",
"age": 27,
"birth": {
"date": "1994-02-13",
"place": "Moordrecht",
"country": "Netherlands"
},
"nationality": "Netherlands",
"height": "176 cm",
"weight": "78 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/667.png"
},
"statistics": [
{
"team": {
"id": 80,
"name": "Lyon",
"logo": "https://media.api-sports.io/football/teams/80.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 30,
"lineups": 26,
"minutes": 2313,
"number": null,
"position": "Attacker",
"rating": "7.496666",
"captain": false
},
"substitutes": {
"in": 4,
"out": 12,
"bench": 4
},
"shots": {
"total": 72,
"on": 39
},
"goals": {
"total": 14,
"conceded": 0,
"assists": 9,
"saves": null
},
"passes": {
"total": 808,
"key": 79,
"accuracy": 22
},
"tackles": {
"total": 4,
"blocks": 1,
"interceptions": 4
},
"duels": {
"total": 282,
"won": 108
},
"dribbles": {
"attempts": 119,
"success": 56,
"past": null
},
"fouls": {
"drawn": 38,
"committed": 27
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 7,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22235,
"name": "J. Bamba",
"firstname": "Jonathan",
"lastname": "Bamba",
"age": 25,
"birth": {
"date": "1996-03-26",
"place": "Alfortville",
"country": "France"
},
"nationality": "France",
"height": "175 cm",
"weight": "72 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22235.png"
},
"statistics": [
{
"team": {
"id": 79,
"name": "Lille",
"logo": "https://media.api-sports.io/football/teams/79.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 29,
"lineups": 27,
"minutes": 2379,
"number": null,
"position": "Attacker",
"rating": "6.965517",
"captain": false
},
"substitutes": {
"in": 2,
"out": 9,
"bench": 2
},
"shots": {
"total": 32,
"on": 14
},
"goals": {
"total": 6,
"conceded": 0,
"assists": 8,
"saves": null
},
"passes": {
"total": 1186,
"key": 52,
"accuracy": 37
},
"tackles": {
"total": 35,
"blocks": 1,
"interceptions": 21
},
"duels": {
"total": 354,
"won": 147
},
"dribbles": {
"attempts": 106,
"success": 48,
"past": null
},
"fouls": {
"drawn": 51,
"committed": 23
},
"cards": {
"yellow": 1,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 266,
"name": "Á. Di María",
"firstname": "Ángel Fabián",
"lastname": "Di María Hernández",
"age": 33,
"birth": {
"date": "1988-02-14",
"place": "Rosario",
"country": "Argentina"
},
"nationality": "Argentina",
"height": "180 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/266.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 21,
"lineups": 19,
"minutes": 1507,
"number": null,
"position": "Midfielder",
"rating": "7.547619",
"captain": false
},
"substitutes": {
"in": 2,
"out": 13,
"bench": 2
},
"shots": {
"total": 36,
"on": 15
},
"goals": {
"total": 4,
"conceded": 0,
"assists": 8,
"saves": null
},
"passes": {
"total": 781,
"key": 54,
"accuracy": 30
},
"tackles": {
"total": 21,
"blocks": 1,
"interceptions": 6
},
"duels": {
"total": 156,
"won": 73
},
"dribbles": {
"attempts": 64,
"success": 29,
"past": null
},
"fouls": {
"drawn": 23,
"committed": 9
},
"cards": {
"yellow": 1,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 989,
"name": "K. Volland",
"firstname": "Kevin",
"lastname": "Volland",
"age": 29,
"birth": {
"date": "1992-07-30",
"place": "Marktoberdorf",
"country": "Germany"
},
"nationality": "Germany",
"height": "178 cm",
"weight": "85 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/989.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 27,
"minutes": 2173,
"number": null,
"position": "Attacker",
"rating": "7.082142",
"captain": false
},
"substitutes": {
"in": 1,
"out": 17,
"bench": 1
},
"shots": {
"total": 33,
"on": 26
},
"goals": {
"total": 13,
"conceded": 0,
"assists": 7,
"saves": null
},
"passes": {
"total": 592,
"key": 27,
"accuracy": 14
},
"tackles": {
"total": 26,
"blocks": null,
"interceptions": 3
},
"duels": {
"total": 282,
"won": 120
},
"dribbles": {
"attempts": 35,
"success": 15,
"past": null
},
"fouls": {
"drawn": 30,
"committed": 42
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21592,
"name": "G. Laborde",
"firstname": "Gaëtan",
"lastname": "Laborde",
"age": 27,
"birth": {
"date": "1994-05-03",
"place": "Mont-de-Marsan",
"country": "France"
},
"nationality": "France",
"height": "182 cm",
"weight": "81 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21592.png"
},
"statistics": [
{
"team": {
"id": 82,
"name": "Montpellier",
"logo": "https://media.api-sports.io/football/teams/82.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 30,
"lineups": 30,
"minutes": 2597,
"number": null,
"position": "Attacker",
"rating": "7.080000",
"captain": false
},
"substitutes": {
"in": 0,
"out": 11,
"bench": 0
},
"shots": {
"total": 63,
"on": 32
},
"goals": {
"total": 10,
"conceded": 0,
"assists": 7,
"saves": null
},
"passes": {
"total": 661,
"key": 32,
"accuracy": 16
},
"tackles": {
"total": 28,
"blocks": 3,
"interceptions": 12
},
"duels": {
"total": 417,
"won": 185
},
"dribbles": {
"attempts": 60,
"success": 28,
"past": null
},
"fouls": {
"drawn": 24,
"committed": 49
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21591,
"name": "A. Delort",
"firstname": "Andy",
"lastname": "Delort",
"age": 30,
"birth": {
"date": "1991-10-09",
"place": "Sete",
"country": "France"
},
"nationality": "Algeria",
"height": "182 cm",
"weight": "82 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21591.png"
},
"statistics": [
{
"team": {
"id": 82,
"name": "Montpellier",
"logo": "https://media.api-sports.io/football/teams/82.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 21,
"lineups": 21,
"minutes": 1700,
"number": null,
"position": "Attacker",
"rating": "7.495238",
"captain": false
},
"substitutes": {
"in": 0,
"out": 10,
"bench": 0
},
"shots": {
"total": 47,
"on": 27
},
"goals": {
"total": 10,
"conceded": 0,
"assists": 7,
"saves": null
},
"passes": {
"total": 511,
"key": 40,
"accuracy": 16
},
"tackles": {
"total": 8,
"blocks": null,
"interceptions": 3
},
"duels": {
"total": 284,
"won": 139
},
"dribbles": {
"attempts": 41,
"success": 19,
"past": null
},
"fouls": {
"drawn": 33,
"committed": 42
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1922,
"name": "F. Thauvin",
"firstname": "Florian",
"lastname": "Thauvin",
"age": 28,
"birth": {
"date": "1993-01-26",
"place": "Orleans",
"country": "France"
},
"nationality": "France",
"height": "179 cm",
"weight": "70 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1922.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 29,
"lineups": 26,
"minutes": 2132,
"number": null,
"position": "Midfielder",
"rating": "7.220689",
"captain": false
},
"substitutes": {
"in": 3,
"out": 17,
"bench": 3
},
"shots": {
"total": 39,
"on": 15
},
"goals": {
"total": 8,
"conceded": 0,
"assists": 7,
"saves": null
},
"passes": {
"total": 887,
"key": 43,
"accuracy": 26
},
"tackles": {
"total": 31,
"blocks": 0,
"interceptions": 11
},
"duels": {
"total": 259,
"won": 130
},
"dribbles": {
"attempts": 84,
"success": 47,
"past": null
},
"fouls": {
"drawn": 42,
"committed": 21
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 2,
"saved": null
}
}
]
},
{
"player": {
"id": 109,
"name": "A. Golovin",
"firstname": "Aleksandr",
"lastname": "Golovin",
"age": 25,
"birth": {
"date": "1996-05-30",
"place": "Kaltan",
"country": "Russia"
},
"nationality": "Russia",
"height": "180 cm",
"weight": "69 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/109.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 14,
"lineups": 6,
"minutes": 609,
"number": null,
"position": "Midfielder",
"rating": "7.400000",
"captain": false
},
"substitutes": {
"in": 8,
"out": 6,
"bench": 8
},
"shots": {
"total": 14,
"on": 7
},
"goals": {
"total": 4,
"conceded": 0,
"assists": 7,
"saves": null
},
"passes": {
"total": 244,
"key": 27,
"accuracy": 22
},
"tackles": {
"total": 17,
"blocks": 0,
"interceptions": 6
},
"duels": {
"total": 94,
"won": 43
},
"dribbles": {
"attempts": 22,
"success": 11,
"past": null
},
"fouls": {
"drawn": 9,
"committed": 9
},
"cards": {
"yellow": 1,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 278,
"name": "K. Mbappé",
"firstname": "Kylian",
"lastname": "Mbappé Lottin",
"age": 23,
"birth": {
"date": "1998-12-20",
"place": "Paris",
"country": "France"
},
"nationality": "France",
"height": "178 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/278.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 21,
"minutes": 1866,
"number": null,
"position": "Attacker",
"rating": "7.328000",
"captain": false
},
"substitutes": {
"in": 4,
"out": 8,
"bench": 4
},
"shots": {
"total": 64,
"on": 40
},
"goals": {
"total": 20,
"conceded": 0,
"assists": 6,
"saves": null
},
"passes": {
"total": 761,
"key": 27,
"accuracy": 24
},
"tackles": {
"total": 3,
"blocks": 1,
"interceptions": 1
},
"duels": {
"total": 259,
"won": 113
},
"dribbles": {
"attempts": 143,
"success": 72,
"past": null
},
"fouls": {
"drawn": 33,
"committed": 17
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 5,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 85041,
"name": "A. Gouiri",
"firstname": "Amine",
"lastname": "Gouiri",
"age": 21,
"birth": {
"date": "2000-02-16",
"place": "Bourgoin-Jallieu",
"country": "France"
},
"nationality": "France",
"height": "180 cm",
"weight": "72 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/85041.png"
},
"statistics": [
{
"team": {
"id": 84,
"name": "Nice",
"logo": "https://media.api-sports.io/football/teams/84.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 29,
"lineups": 27,
"minutes": 2429,
"number": null,
"position": "Attacker",
"rating": "7.227586",
"captain": false
},
"substitutes": {
"in": 2,
"out": 7,
"bench": 2
},
"shots": {
"total": 61,
"on": 34
},
"goals": {
"total": 12,
"conceded": 0,
"assists": 6,
"saves": null
},
"passes": {
"total": 905,
"key": 44,
"accuracy": 28
},
"tackles": {
"total": 24,
"blocks": 6,
"interceptions": 14
},
"duels": {
"total": 306,
"won": 119
},
"dribbles": {
"attempts": 81,
"success": 45,
"past": null
},
"fouls": {
"drawn": 31,
"committed": 42
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 4,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 663,
"name": "M. Terrier",
"firstname": "Martin",
"lastname": "Terrier",
"age": 24,
"birth": {
"date": "1997-03-04",
"place": "Armentières",
"country": "France"
},
"nationality": "France",
"height": "184 cm",
"weight": "71 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/663.png"
},
"statistics": [
{
"team": {
"id": 94,
"name": "Rennes",
"logo": "https://media.api-sports.io/football/teams/94.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 22,
"minutes": 1821,
"number": null,
"position": "Attacker",
"rating": "7.048000",
"captain": false
},
"substitutes": {
"in": 4,
"out": 15,
"bench": 4
},
"shots": {
"total": 27,
"on": 10
},
"goals": {
"total": 5,
"conceded": 0,
"assists": 6,
"saves": null
},
"passes": {
"total": 599,
"key": 28,
"accuracy": 23
},
"tackles": {
"total": 29,
"blocks": 0,
"interceptions": 15
},
"duels": {
"total": 251,
"won": 124
},
"dribbles": {
"attempts": 40,
"success": 25,
"past": null
},
"fouls": {
"drawn": 30,
"committed": 27
},
"cards": {
"yellow": 2,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 1,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 3175,
"name": "Z. Ferhat",
"firstname": "Zinedine",
"lastname": "Ferhat",
"age": 28,
"birth": {
"date": "1993-03-01",
"place": "Bordj Menaïel",
"country": "Algeria"
},
"nationality": "Algeria",
"height": "183 cm",
"weight": "77 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/3175.png"
},
"statistics": [
{
"team": {
"id": 92,
"name": "Nimes",
"logo": "https://media.api-sports.io/football/teams/92.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 25,
"minutes": 2244,
"number": null,
"position": "Midfielder",
"rating": "7.076000",
"captain": false
},
"substitutes": {
"in": 0,
"out": 1,
"bench": 0
},
"shots": {
"total": 37,
"on": 18
},
"goals": {
"total": 4,
"conceded": 0,
"assists": 6,
"saves": null
},
"passes": {
"total": 809,
"key": 39,
"accuracy": 27
},
"tackles": {
"total": 28,
"blocks": 0,
"interceptions": 25
},
"duels": {
"total": 350,
"won": 186
},
"dribbles": {
"attempts": 95,
"success": 48,
"past": null
},
"fouls": {
"drawn": 52,
"committed": 18
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1709,
"name": "K. Toko Ekambi",
"firstname": "Karl Brillant",
"lastname": "Toko Ekambi",
"age": 29,
"birth": {
"date": "1992-09-14",
"place": "Paris",
"country": "France"
},
"nationality": "Cameroon",
"height": "185 cm",
"weight": "74 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1709.png"
},
"statistics": [
{
"team": {
"id": 80,
"name": "Lyon",
"logo": "https://media.api-sports.io/football/teams/80.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 27,
"lineups": 26,
"minutes": 2142,
"number": null,
"position": "Attacker",
"rating": "7.259259",
"captain": false
},
"substitutes": {
"in": 1,
"out": 15,
"bench": 1
},
"shots": {
"total": 56,
"on": 32
},
"goals": {
"total": 12,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 663,
"key": 40,
"accuracy": 22
},
"tackles": {
"total": 12,
"blocks": 0,
"interceptions": 20
},
"duels": {
"total": 224,
"won": 98
},
"dribbles": {
"attempts": 85,
"success": 50,
"past": null
},
"fouls": {
"drawn": 15,
"committed": 20
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 20526,
"name": "F. Boulaya",
"firstname": "Farid",
"lastname": "Boulaya",
"age": 28,
"birth": {
"date": "1993-02-25",
"place": "Vitrolles",
"country": "France"
},
"nationality": "Algeria",
"height": "179 cm",
"weight": "70 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20526.png"
},
"statistics": [
{
"team": {
"id": 112,
"name": "Metz",
"logo": "https://media.api-sports.io/football/teams/112.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 26,
"minutes": 2309,
"number": null,
"position": "Midfielder",
"rating": "7.496153",
"captain": false
},
"substitutes": {
"in": 0,
"out": 6,
"bench": 1
},
"shots": {
"total": 48,
"on": 24
},
"goals": {
"total": 5,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 1092,
"key": 61,
"accuracy": 33
},
"tackles": {
"total": 19,
"blocks": 2,
"interceptions": 9
},
"duels": {
"total": 286,
"won": 141
},
"dribbles": {
"attempts": 74,
"success": 48,
"past": null
},
"fouls": {
"drawn": 51,
"committed": 18
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 1,
"saved": null
}
}
]
},
{
"player": {
"id": 20600,
"name": "R. Perraud",
"firstname": "Romain",
"lastname": "Perraud",
"age": 24,
"birth": {
"date": "1997-09-22",
"place": "Toulouse",
"country": "France"
},
"nationality": "France",
"height": "173 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20600.png"
},
"statistics": [
{
"team": {
"id": 106,
"name": "Stade Brestois 29",
"logo": "https://media.api-sports.io/football/teams/106.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 27,
"lineups": 26,
"minutes": 2331,
"number": null,
"position": "Defender",
"rating": "6.970370",
"captain": false
},
"substitutes": {
"in": 1,
"out": 1,
"bench": 1
},
"shots": {
"total": 28,
"on": 11
},
"goals": {
"total": 3,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 1109,
"key": 27,
"accuracy": 34
},
"tackles": {
"total": 49,
"blocks": 3,
"interceptions": 34
},
"duels": {
"total": 237,
"won": 132
},
"dribbles": {
"attempts": 32,
"success": 22,
"past": null
},
"fouls": {
"drawn": 42,
"committed": 37
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 665,
"name": "M. Cornet",
"firstname": "Gnaly Maxwel",
"lastname": "Cornet",
"age": 25,
"birth": {
"date": "1996-09-27",
"place": "Bregbo",
"country": "Côte d'Ivoire"
},
"nationality": "Côte d'Ivoire",
"height": "179 cm",
"weight": "69 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/665.png"
},
"statistics": [
{
"team": {
"id": 80,
"name": "Lyon",
"logo": "https://media.api-sports.io/football/teams/80.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 22,
"minutes": 1867,
"number": null,
"position": "Attacker",
"rating": "6.996428",
"captain": false
},
"substitutes": {
"in": 6,
"out": 15,
"bench": 6
},
"shots": {
"total": 13,
"on": 8
},
"goals": {
"total": 2,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 1044,
"key": 23,
"accuracy": 32
},
"tackles": {
"total": 56,
"blocks": 3,
"interceptions": 32
},
"duels": {
"total": 222,
"won": 126
},
"dribbles": {
"attempts": 29,
"success": 18,
"past": null
},
"fouls": {
"drawn": 26,
"committed": 26
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": 1,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1265,
"name": "Y. Adli",
"firstname": "Yacine",
"lastname": "Adli",
"age": 21,
"birth": {
"date": "2000-07-29",
"place": "Vitry-sur-Seine",
"country": "France"
},
"nationality": "France",
"height": "186 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1265.png"
},
"statistics": [
{
"team": {
"id": 78,
"name": "Bordeaux",
"logo": "https://media.api-sports.io/football/teams/78.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 16,
"minutes": 1622,
"number": null,
"position": "Midfielder",
"rating": "6.996153",
"captain": false
},
"substitutes": {
"in": 10,
"out": 8,
"bench": 10
},
"shots": {
"total": 10,
"on": 5
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 1077,
"key": 38,
"accuracy": 35
},
"tackles": {
"total": 58,
"blocks": 2,
"interceptions": 30
},
"duels": {
"total": 265,
"won": 137
},
"dribbles": {
"attempts": 56,
"success": 36,
"past": null
},
"fouls": {
"drawn": 25,
"committed": 24
},
"cards": {
"yellow": 6,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21585,
"name": "S. Sambia",
"firstname": "Salomon Junior",
"lastname": "Sambia",
"age": 25,
"birth": {
"date": "1996-09-07",
"place": "Lyon",
"country": "France"
},
"nationality": "France",
"height": "181 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21585.png"
},
"statistics": [
{
"team": {
"id": 82,
"name": "Montpellier",
"logo": "https://media.api-sports.io/football/teams/82.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 19,
"minutes": 1819,
"number": null,
"position": "Midfielder",
"rating": "6.818518",
"captain": false
},
"substitutes": {
"in": 9,
"out": 4,
"bench": 10
},
"shots": {
"total": 13,
"on": 4
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 808,
"key": 24,
"accuracy": 26
},
"tackles": {
"total": 37,
"blocks": 6,
"interceptions": 29
},
"duels": {
"total": 228,
"won": 126
},
"dribbles": {
"attempts": 53,
"success": 26,
"past": null
},
"fouls": {
"drawn": 30,
"committed": 18
},
"cards": {
"yellow": 1,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 19334,
"name": "B. Celina",
"firstname": "Bersant",
"lastname": "Celina",
"age": 25,
"birth": {
"date": "1996-09-09",
"place": "Prizren",
"country": "Kosovo"
},
"nationality": "Kosovo",
"height": "181 cm",
"weight": null,
"injured": false,
"photo": "https://media.api-sports.io/football/players/19334.png"
},
"statistics": [
{
"team": {
"id": 89,
"name": "Dijon",
"logo": "https://media.api-sports.io/football/teams/89.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 19,
"minutes": 1819,
"number": null,
"position": "Midfielder",
"rating": "6.792307",
"captain": false
},
"substitutes": {
"in": 7,
"out": 6,
"bench": 7
},
"shots": {
"total": 17,
"on": 5
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 5,
"saves": null
},
"passes": {
"total": 751,
"key": 44,
"accuracy": 23
},
"tackles": {
"total": 9,
"blocks": 1,
"interceptions": 4
},
"duels": {
"total": 129,
"won": 41
},
"dribbles": {
"attempts": 34,
"success": 19,
"past": null
},
"fouls": {
"drawn": 12,
"committed": 13
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 2059,
"name": "W. Ben Yedder",
"firstname": "Wissam",
"lastname": "Ben Yedder",
"age": 31,
"birth": {
"date": "1990-08-12",
"place": "Sarcelles",
"country": "France"
},
"nationality": "France",
"height": "170 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/2059.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 29,
"lineups": 27,
"minutes": 2073,
"number": null,
"position": "Attacker",
"rating": "7.024137",
"captain": false
},
"substitutes": {
"in": 2,
"out": 20,
"bench": 2
},
"shots": {
"total": 45,
"on": 25
},
"goals": {
"total": 13,
"conceded": 0,
"assists": 4,
"saves": null
},
"passes": {
"total": 661,
"key": 30,
"accuracy": 20
},
"tackles": {
"total": 17,
"blocks": 0,
"interceptions": 11
},
"duels": {
"total": 224,
"won": 97
},
"dribbles": {
"attempts": 49,
"success": 23,
"past": null
},
"fouls": {
"drawn": 27,
"committed": 7
},
"cards": {
"yellow": 2,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 7,
"missed": 1,
"saved": null
}
}
]
}
]
}
Top Yellow Cards
Get the 20 players with the most yellow cards for a league or cup.

How it is calculated:

1 : The player that received the higher number of yellow cards
2 : The player that received the higher number of red cards
3 : The player that assists in the higher number of matches
4 : The player that played the fewer minutes
Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/topyellowcards

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topyellowcards');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
	'season' => '2020',
	'league' => '61'
)));

$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/topyellowcards",
"parameters": {
"season": "2020",
"league": "61"
},
"errors": [ ],
"results": 20,
"paging": {
"current": 0,
"total": 1
},
"response": [
{
"player": {
"id": 8694,
"name": "W. Faes",
"firstname": "Wout",
"lastname": "Faes",
"age": 23,
"birth": {
"date": "1998-04-03",
"place": null,
"country": "Belgium"
},
"nationality": "Belgium",
"height": "187 cm",
"weight": "84 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/8694.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 26,
"minutes": 2292,
"number": null,
"position": "Defender",
"rating": "6.907692",
"captain": false
},
"substitutes": {
"in": 0,
"out": 0,
"bench": 0
},
"shots": {
"total": 5,
"on": 1
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1228,
"key": 0,
"accuracy": 43
},
"tackles": {
"total": 25,
"blocks": 24,
"interceptions": 55
},
"duels": {
"total": 164,
"won": 95
},
"dribbles": {
"attempts": 12,
"success": 10,
"past": null
},
"fouls": {
"drawn": 12,
"committed": 16
},
"cards": {
"yellow": 10,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1689,
"name": "Álvaro González",
"firstname": "Álvaro",
"lastname": "González Soberón",
"age": 31,
"birth": {
"date": "1990-01-08",
"place": "Potes",
"country": "Spain"
},
"nationality": "Spain",
"height": "182 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1689.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 25,
"minutes": 2204,
"number": null,
"position": "Defender",
"rating": "6.912000",
"captain": false
},
"substitutes": {
"in": 0,
"out": 3,
"bench": 0
},
"shots": {
"total": 9,
"on": 2
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 3,
"saves": null
},
"passes": {
"total": 1367,
"key": 4,
"accuracy": 47
},
"tackles": {
"total": 25,
"blocks": 12,
"interceptions": 26
},
"duels": {
"total": 160,
"won": 91
},
"dribbles": {
"attempts": 3,
"success": 3,
"past": null
},
"fouls": {
"drawn": 23,
"committed": 26
},
"cards": {
"yellow": 10,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 6231,
"name": "F. Medina",
"firstname": "Facundo Axel",
"lastname": "Medina",
"age": 22,
"birth": {
"date": "1999-05-28",
"place": "Buenos Aires",
"country": "Argentina"
},
"nationality": "Argentina",
"height": "180 cm",
"weight": "78 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/6231.png"
},
"statistics": [
{
"team": {
"id": 116,
"name": "Lens",
"logo": "https://media.api-sports.io/football/teams/116.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 21,
"lineups": 20,
"minutes": 1769,
"number": null,
"position": "Defender",
"rating": "6.761904",
"captain": false
},
"substitutes": {
"in": 1,
"out": 1,
"bench": 5
},
"shots": {
"total": 7,
"on": 4
},
"goals": {
"total": 2,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1396,
"key": 8,
"accuracy": 58
},
"tackles": {
"total": 34,
"blocks": 7,
"interceptions": 34
},
"duels": {
"total": 154,
"won": 71
},
"dribbles": {
"attempts": 10,
"success": 6,
"past": null
},
"fouls": {
"drawn": 7,
"committed": 28
},
"cards": {
"yellow": 9,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21635,
"name": "J. Gradit",
"firstname": "Jonathan",
"lastname": "Gradit",
"age": 29,
"birth": {
"date": "1992-11-24",
"place": "Talence",
"country": "France"
},
"nationality": "France",
"height": "180 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21635.png"
},
"statistics": [
{
"team": {
"id": 116,
"name": "Lens",
"logo": "https://media.api-sports.io/football/teams/116.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 26,
"minutes": 2198,
"number": null,
"position": "Defender",
"rating": "6.904000",
"captain": false
},
"substitutes": {
"in": 0,
"out": 5,
"bench": 1
},
"shots": {
"total": 1,
"on": 0
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1303,
"key": 4,
"accuracy": 47
},
"tackles": {
"total": 50,
"blocks": 12,
"interceptions": 41
},
"duels": {
"total": 271,
"won": 162
},
"dribbles": {
"attempts": 35,
"success": 24,
"past": null
},
"fouls": {
"drawn": 46,
"committed": 41
},
"cards": {
"yellow": 8,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 20696,
"name": "P. Gueye",
"firstname": "Pape Alassane",
"lastname": "Gueye",
"age": 22,
"birth": {
"date": "1999-01-24",
"place": "Montreuil",
"country": "France"
},
"nationality": "France",
"height": "187 cm",
"weight": "65 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20696.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 16,
"minutes": 1485,
"number": null,
"position": "Midfielder",
"rating": "6.684000",
"captain": false
},
"substitutes": {
"in": 9,
"out": 6,
"bench": 11
},
"shots": {
"total": 6,
"on": 2
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 924,
"key": 5,
"accuracy": 30
},
"tackles": {
"total": 39,
"blocks": 5,
"interceptions": 36
},
"duels": {
"total": 216,
"won": 106
},
"dribbles": {
"attempts": 9,
"success": 4,
"past": null
},
"fouls": {
"drawn": 30,
"committed": 36
},
"cards": {
"yellow": 8,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22004,
"name": "Moreto Cassamã",
"firstname": "Moreto Moro",
"lastname": "Cassamã",
"age": 23,
"birth": {
"date": "1998-02-16",
"place": "Bissau",
"country": "Portugal"
},
"nationality": "Guinea-Bissau",
"height": "165 cm",
"weight": "63 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22004.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 23,
"lineups": 20,
"minutes": 1550,
"number": null,
"position": "Midfielder",
"rating": "6.760869",
"captain": false
},
"substitutes": {
"in": 3,
"out": 10,
"bench": 5
},
"shots": {
"total": 7,
"on": 2
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1005,
"key": 10,
"accuracy": 43
},
"tackles": {
"total": 31,
"blocks": 5,
"interceptions": 33
},
"duels": {
"total": 131,
"won": 74
},
"dribbles": {
"attempts": 24,
"success": 22,
"past": null
},
"fouls": {
"drawn": 18,
"committed": 22
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 2
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1902,
"name": "D. Ćaleta-Car",
"firstname": "Duje",
"lastname": "Ćaleta-Car",
"age": 25,
"birth": {
"date": "1996-09-17",
"place": "Šibenik",
"country": "Croatia"
},
"nationality": "Croatia",
"height": "192 cm",
"weight": "89 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1902.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 27,
"minutes": 2423,
"number": null,
"position": "Defender",
"rating": "6.985185",
"captain": false
},
"substitutes": {
"in": 1,
"out": 2,
"bench": 1
},
"shots": {
"total": 9,
"on": 3
},
"goals": {
"total": 2,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1558,
"key": 4,
"accuracy": 51
},
"tackles": {
"total": 25,
"blocks": 20,
"interceptions": 39
},
"duels": {
"total": 176,
"won": 108
},
"dribbles": {
"attempts": 2,
"success": 2,
"past": null
},
"fouls": {
"drawn": 14,
"committed": 26
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21504,
"name": "D. Ndong",
"firstname": "Didier",
"lastname": "Ndong Ibrahim",
"age": 27,
"birth": {
"date": "1994-06-17",
"place": "Lambaréné",
"country": "Gabon"
},
"nationality": "Gabon",
"height": "179 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21504.png"
},
"statistics": [
{
"team": {
"id": 89,
"name": "Dijon",
"logo": "https://media.api-sports.io/football/teams/89.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 28,
"minutes": 2520,
"number": null,
"position": "Midfielder",
"rating": "6.767857",
"captain": false
},
"substitutes": {
"in": 0,
"out": 0,
"bench": 1
},
"shots": {
"total": 6,
"on": 1
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1370,
"key": 10,
"accuracy": 46
},
"tackles": {
"total": 52,
"blocks": 7,
"interceptions": 35
},
"duels": {
"total": 247,
"won": 114
},
"dribbles": {
"attempts": 27,
"success": 20,
"past": null
},
"fouls": {
"drawn": 17,
"committed": 38
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 20531,
"name": "H. Maïga",
"firstname": "Digbo G'nampa Habib",
"lastname": "Maïga",
"age": 25,
"birth": {
"date": "1996-01-01",
"place": "Gagnoa",
"country": "Côte d'Ivoire"
},
"nationality": "Côte d'Ivoire",
"height": "181 cm",
"weight": "80 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20531.png"
},
"statistics": [
{
"team": {
"id": 112,
"name": "Metz",
"logo": "https://media.api-sports.io/football/teams/112.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 23,
"lineups": 23,
"minutes": 2006,
"number": null,
"position": "Midfielder",
"rating": "6.978260",
"captain": false
},
"substitutes": {
"in": 0,
"out": 3,
"bench": 0
},
"shots": {
"total": 16,
"on": 4
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 3,
"saves": null
},
"passes": {
"total": 969,
"key": 24,
"accuracy": 36
},
"tackles": {
"total": 65,
"blocks": 4,
"interceptions": 43
},
"duels": {
"total": 290,
"won": 155
},
"dribbles": {
"attempts": 40,
"success": 29,
"past": null
},
"fouls": {
"drawn": 30,
"committed": 45
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22143,
"name": "Y. Cahuzac",
"firstname": "Yannick",
"lastname": "Cahuzac",
"age": 36,
"birth": {
"date": "1985-01-18",
"place": "Ajaccio",
"country": "France"
},
"nationality": "France",
"height": "178 cm",
"weight": "72 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22143.png"
},
"statistics": [
{
"team": {
"id": 116,
"name": "Lens",
"logo": "https://media.api-sports.io/football/teams/116.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 18,
"minutes": 1561,
"number": null,
"position": "Midfielder",
"rating": "6.720000",
"captain": false
},
"substitutes": {
"in": 4,
"out": 6,
"bench": 9
},
"shots": {
"total": 3,
"on": 1
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 627,
"key": 9,
"accuracy": 26
},
"tackles": {
"total": 18,
"blocks": 4,
"interceptions": 24
},
"duels": {
"total": 118,
"won": 60
},
"dribbles": {
"attempts": 4,
"success": 3,
"past": null
},
"fouls": {
"drawn": 15,
"committed": 22
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1271,
"name": "A. Tchouaméni",
"firstname": "Aurélien",
"lastname": "Tchouaméni",
"age": 21,
"birth": {
"date": "2000-01-27",
"place": "Rouen",
"country": "France"
},
"nationality": "France",
"height": "185 cm",
"weight": "80 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1271.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 29,
"lineups": 29,
"minutes": 2450,
"number": null,
"position": "Midfielder",
"rating": "7.175862",
"captain": false
},
"substitutes": {
"in": 0,
"out": 8,
"bench": 0
},
"shots": {
"total": 29,
"on": 10
},
"goals": {
"total": 2,
"conceded": 0,
"assists": 2,
"saves": null
},
"passes": {
"total": 1420,
"key": 15,
"accuracy": 44
},
"tackles": {
"total": 102,
"blocks": 10,
"interceptions": 50
},
"duels": {
"total": 380,
"won": 231
},
"dribbles": {
"attempts": 30,
"success": 19,
"past": null
},
"fouls": {
"drawn": 46,
"committed": 49
},
"cards": {
"yellow": 7,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22254,
"name": "Y. Fofana",
"firstname": "Youssouf",
"lastname": "Fofana",
"age": 22,
"birth": {
"date": "1999-01-10",
"place": null,
"country": "France"
},
"nationality": "France",
"height": "178 cm",
"weight": null,
"injured": false,
"photo": "https://media.api-sports.io/football/players/22254.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 27,
"lineups": 27,
"minutes": 2204,
"number": null,
"position": "Midfielder",
"rating": "6.833333",
"captain": false
},
"substitutes": {
"in": 0,
"out": 7,
"bench": 1
},
"shots": {
"total": 16,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1253,
"key": 22,
"accuracy": 43
},
"tackles": {
"total": 78,
"blocks": 3,
"interceptions": 29
},
"duels": {
"total": 265,
"won": 137
},
"dribbles": {
"attempts": 44,
"success": 22,
"past": null
},
"fouls": {
"drawn": 26,
"committed": 39
},
"cards": {
"yellow": 7,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 18764,
"name": "M. Schneiderlin",
"firstname": "Morgan",
"lastname": "Schneiderlin",
"age": 32,
"birth": {
"date": "1989-11-08",
"place": "Zellwiller",
"country": "France"
},
"nationality": "France",
"height": "181 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/18764.png"
},
"statistics": [
{
"team": {
"id": 84,
"name": "Nice",
"logo": "https://media.api-sports.io/football/teams/84.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 19,
"minutes": 1756,
"number": null,
"position": "Midfielder",
"rating": "6.890909",
"captain": false
},
"substitutes": {
"in": 3,
"out": 1,
"bench": 5
},
"shots": {
"total": 8,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1250,
"key": 10,
"accuracy": 53
},
"tackles": {
"total": 40,
"blocks": 11,
"interceptions": 44
},
"duels": {
"total": 189,
"won": 87
},
"dribbles": {
"attempts": 16,
"success": 12,
"past": null
},
"fouls": {
"drawn": 6,
"committed": 37
},
"cards": {
"yellow": 7,
"yellowred": 1,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 20654,
"name": "F. Centonze",
"firstname": "Fabien",
"lastname": "Centonze",
"age": 25,
"birth": {
"date": "1996-01-16",
"place": "Voiron",
"country": "France"
},
"nationality": "France",
"height": "182 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20654.png"
},
"statistics": [
{
"team": {
"id": 112,
"name": "Metz",
"logo": "https://media.api-sports.io/football/teams/112.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 28,
"minutes": 2502,
"number": null,
"position": "Defender",
"rating": "7.121428",
"captain": false
},
"substitutes": {
"in": 0,
"out": 1,
"bench": 0
},
"shots": {
"total": 13,
"on": 4
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 971,
"key": 19,
"accuracy": 28
},
"tackles": {
"total": 83,
"blocks": 15,
"interceptions": 90
},
"duels": {
"total": 363,
"won": 214
},
"dribbles": {
"attempts": 80,
"success": 44,
"past": null
},
"fouls": {
"drawn": 43,
"committed": 32
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 3339,
"name": "C. Doucouré",
"firstname": "Cheick Oumar",
"lastname": "Doucouré",
"age": 21,
"birth": {
"date": "2000-01-08",
"place": "Bamako",
"country": "Mali"
},
"nationality": "Mali",
"height": "180 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/3339.png"
},
"statistics": [
{
"team": {
"id": 116,
"name": "Lens",
"logo": "https://media.api-sports.io/football/teams/116.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 23,
"minutes": 2032,
"number": null,
"position": "Midfielder",
"rating": "7.080000",
"captain": false
},
"substitutes": {
"in": 3,
"out": 6,
"bench": 5
},
"shots": {
"total": 18,
"on": 5
},
"goals": {
"total": 2,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1093,
"key": 22,
"accuracy": 40
},
"tackles": {
"total": 67,
"blocks": 3,
"interceptions": 38
},
"duels": {
"total": 227,
"won": 129
},
"dribbles": {
"attempts": 37,
"success": 31,
"past": null
},
"fouls": {
"drawn": 9,
"committed": 36
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 179843,
"name": "L. Gourna-Douath",
"firstname": "Lucas",
"lastname": "Gourna-Douath",
"age": 18,
"birth": {
"date": "2003-08-05",
"place": null,
"country": "France"
},
"nationality": "France",
"height": null,
"weight": null,
"injured": false,
"photo": "https://media.api-sports.io/football/players/179843.png"
},
"statistics": [
{
"team": {
"id": 1063,
"name": "Saint Etienne",
"logo": "https://media.api-sports.io/football/teams/1063.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 24,
"lineups": 10,
"minutes": 1031,
"number": null,
"position": "Midfielder",
"rating": "6.547619",
"captain": false
},
"substitutes": {
"in": 14,
"out": 5,
"bench": 19
},
"shots": {
"total": 3,
"on": null
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 475,
"key": 2,
"accuracy": 18
},
"tackles": {
"total": 27,
"blocks": null,
"interceptions": 21
},
"duels": {
"total": 131,
"won": 65
},
"dribbles": {
"attempts": 8,
"success": 4,
"past": null
},
"fouls": {
"drawn": 24,
"committed": 27
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 2198,
"name": "S. Doumbia",
"firstname": "Souleyman",
"lastname": "Doumbia",
"age": 25,
"birth": {
"date": "1996-09-24",
"place": "Paris",
"country": "France"
},
"nationality": "Côte d'Ivoire",
"height": "177 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/2198.png"
},
"statistics": [
{
"team": {
"id": 77,
"name": "Angers",
"logo": "https://media.api-sports.io/football/teams/77.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 23,
"lineups": 21,
"minutes": 1918,
"number": null,
"position": "Defender",
"rating": "6.669565",
"captain": false
},
"substitutes": {
"in": 2,
"out": 2,
"bench": 3
},
"shots": {
"total": 7,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 780,
"key": 12,
"accuracy": 32
},
"tackles": {
"total": 43,
"blocks": 4,
"interceptions": 39
},
"duels": {
"total": 175,
"won": 94
},
"dribbles": {
"attempts": 32,
"success": 20,
"past": null
},
"fouls": {
"drawn": 13,
"committed": 26
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22005,
"name": "X. Chavalerin",
"firstname": "Xavier",
"lastname": "Chavalerin",
"age": 30,
"birth": {
"date": "1991-03-07",
"place": "Villeurbanne",
"country": "France"
},
"nationality": "France",
"height": "178 cm",
"weight": "66 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22005.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 21,
"minutes": 1743,
"number": null,
"position": "Midfielder",
"rating": "6.966666",
"captain": false
},
"substitutes": {
"in": 1,
"out": 3,
"bench": 1
},
"shots": {
"total": 13,
"on": 5
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 2,
"saves": null
},
"passes": {
"total": 626,
"key": 15,
"accuracy": 30
},
"tackles": {
"total": 66,
"blocks": 6,
"interceptions": 25
},
"duels": {
"total": 185,
"won": 98
},
"dribbles": {
"attempts": 19,
"success": 13,
"past": null
},
"fouls": {
"drawn": 6,
"committed": 31
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 103,
"name": "J. Aholou",
"firstname": "Jean Eudès",
"lastname": "Aholou",
"age": 27,
"birth": {
"date": "1994-03-20",
"place": "Yopougnon",
"country": "Côte d'Ivoire"
},
"nationality": "Côte d'Ivoire",
"height": "186 cm",
"weight": "71 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/103.png"
},
"statistics": [
{
"team": {
"id": 95,
"name": "Strasbourg",
"logo": "https://media.api-sports.io/football/teams/95.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 20,
"lineups": 19,
"minutes": 1561,
"number": null,
"position": "Midfielder",
"rating": "6.550000",
"captain": false
},
"substitutes": {
"in": 1,
"out": 9,
"bench": 1
},
"shots": {
"total": 2,
"on": 1
},
"goals": {
"total": 2,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 7,
"key": 0,
"accuracy": 62
},
"tackles": {
"total": 1,
"blocks": 0,
"interceptions": 1
},
"duels": {
"total": 5,
"won": 3
},
"dribbles": {
"attempts": 0,
"success": 0,
"past": null
},
"fouls": {
"drawn": 1,
"committed": 0
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 4399,
"name": "H. Boudaoui",
"firstname": "Hichem",
"lastname": "Boudaoui",
"age": 22,
"birth": {
"date": "1999-09-23",
"place": "Béchar",
"country": "Algeria"
},
"nationality": "Algeria",
"height": "175 cm",
"weight": "61 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/4399.png"
},
"statistics": [
{
"team": {
"id": 84,
"name": "Nice",
"logo": "https://media.api-sports.io/football/teams/84.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 19,
"lineups": 17,
"minutes": 1327,
"number": null,
"position": "Midfielder",
"rating": "6.731578",
"captain": false
},
"substitutes": {
"in": 2,
"out": 12,
"bench": 3
},
"shots": {
"total": 9,
"on": 5
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 2,
"saves": null
},
"passes": {
"total": 648,
"key": 7,
"accuracy": 28
},
"tackles": {
"total": 44,
"blocks": 3,
"interceptions": 21
},
"duels": {
"total": 200,
"won": 93
},
"dribbles": {
"attempts": 29,
"success": 18,
"past": null
},
"fouls": {
"drawn": 19,
"committed": 23
},
"cards": {
"yellow": 7,
"yellowred": 0,
"red": 0
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
}
]
}
Top Red Cards
Get the 20 players with the most red cards for a league or cup.

How it is calculated:

1 : The player that received the higher number of red cards
2 : The player that received the higher number of yellow cards
3 : The player that assists in the higher number of matches
4 : The player that played the fewer minutes
Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
league
required
integer
The id of the league

season
required
integer = 4 characters YYYY
The season of the league

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/players/topredcards

Request samples
PhpPythonNodeJavaScriptCurlRuby

Copy
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topredcards');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
	'season' => '2020',
	'league' => '61'
)));

$request->setHeaders(array(
	'x-apisports-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "players/topredcards",
"parameters": {
"season": "2020",
"league": "61"
},
"errors": [ ],
"results": 20,
"paging": {
"current": 0,
"total": 1
},
"response": [
{
"player": {
"id": 22004,
"name": "Moreto Cassamã",
"firstname": "Moreto Moro",
"lastname": "Cassamã",
"age": 23,
"birth": {
"date": "1998-02-16",
"place": "Bissau",
"country": "Portugal"
},
"nationality": "Guinea-Bissau",
"height": "165 cm",
"weight": "63 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22004.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 23,
"lineups": 20,
"minutes": 1550,
"number": null,
"position": "Midfielder",
"rating": "6.760869",
"captain": false
},
"substitutes": {
"in": 3,
"out": 10,
"bench": 5
},
"shots": {
"total": 7,
"on": 2
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1005,
"key": 10,
"accuracy": 43
},
"tackles": {
"total": 31,
"blocks": 5,
"interceptions": 33
},
"duels": {
"total": 131,
"won": 74
},
"dribbles": {
"attempts": 24,
"success": 22,
"past": null
},
"fouls": {
"drawn": 18,
"committed": 22
},
"cards": {
"yellow": 8,
"yellowred": 0,
"red": 2
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21998,
"name": "A. Disasi",
"firstname": "Axel",
"lastname": "Disasi",
"age": 23,
"birth": {
"date": "1998-03-11",
"place": "Gonesse",
"country": "France"
},
"nationality": "France",
"height": "190 cm",
"weight": "86 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21998.png"
},
"statistics": [
{
"team": {
"id": 91,
"name": "Monaco",
"logo": "https://media.api-sports.io/football/teams/91.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 19,
"minutes": 1602,
"number": null,
"position": "Defender",
"rating": "6.747619",
"captain": false
},
"substitutes": {
"in": 3,
"out": 3,
"bench": 8
},
"shots": {
"total": 13,
"on": 6
},
"goals": {
"total": 3,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1180,
"key": 4,
"accuracy": 47
},
"tackles": {
"total": 21,
"blocks": 10,
"interceptions": 21
},
"duels": {
"total": 143,
"won": 77
},
"dribbles": {
"attempts": 8,
"success": 5,
"past": null
},
"fouls": {
"drawn": 12,
"committed": 21
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 2
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1912,
"name": "D. Payet",
"firstname": "Dimitri",
"lastname": "Payet",
"age": 34,
"birth": {
"date": "1987-03-29",
"place": "Saint-Pierre",
"country": "Réunion"
},
"nationality": "France",
"height": "175 cm",
"weight": "77 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1912.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 20,
"minutes": 1716,
"number": null,
"position": "Midfielder",
"rating": "6.956000",
"captain": false
},
"substitutes": {
"in": 5,
"out": 11,
"bench": 5
},
"shots": {
"total": 21,
"on": 9
},
"goals": {
"total": 4,
"conceded": 0,
"assists": 4,
"saves": null
},
"passes": {
"total": 816,
"key": 45,
"accuracy": 25
},
"tackles": {
"total": 17,
"blocks": 2,
"interceptions": 4
},
"duels": {
"total": 156,
"won": 81
},
"dribbles": {
"attempts": 46,
"success": 28,
"past": null
},
"fouls": {
"drawn": 32,
"committed": 11
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 2
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 1,
"saved": null
}
}
]
},
{
"player": {
"id": 21571,
"name": "Hilton",
"firstname": "Vitorino",
"lastname": "Hilton da Silva",
"age": 44,
"birth": {
"date": "1977-09-13",
"place": "Brasília",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "180 cm",
"weight": "78 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21571.png"
},
"statistics": [
{
"team": {
"id": 82,
"name": "Montpellier",
"logo": "https://media.api-sports.io/football/teams/82.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 18,
"minutes": 1537,
"number": null,
"position": "Defender",
"rating": "6.588888",
"captain": false
},
"substitutes": {
"in": 4,
"out": 0,
"bench": 7
},
"shots": {
"total": 10,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 808,
"key": null,
"accuracy": 33
},
"tackles": {
"total": 10,
"blocks": 19,
"interceptions": 27
},
"duels": {
"total": 91,
"won": 49
},
"dribbles": {
"attempts": 1,
"success": 1,
"past": null
},
"fouls": {
"drawn": 10,
"committed": 15
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 2
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 2478,
"name": "D. Benedetto",
"firstname": "Darío Ismael",
"lastname": "Benedetto",
"age": 31,
"birth": {
"date": "1990-05-17",
"place": "Berazategui",
"country": "Argentina"
},
"nationality": "Argentina",
"height": "177 cm",
"weight": "75 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/2478.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 18,
"minutes": 1484,
"number": null,
"position": "Attacker",
"rating": "6.553846",
"captain": false
},
"substitutes": {
"in": 8,
"out": 15,
"bench": 8
},
"shots": {
"total": 32,
"on": 13
},
"goals": {
"total": 4,
"conceded": 0,
"assists": 3,
"saves": null
},
"passes": {
"total": 310,
"key": 13,
"accuracy": 9
},
"tackles": {
"total": 5,
"blocks": 2,
"interceptions": 3
},
"duels": {
"total": 164,
"won": 56
},
"dribbles": {
"attempts": 15,
"success": 9,
"past": null
},
"fouls": {
"drawn": 19,
"committed": 17
},
"cards": {
"yellow": 2,
"yellowred": 1,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 1,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21433,
"name": "F. Miguel",
"firstname": "Florian",
"lastname": "Miguel",
"age": 25,
"birth": {
"date": "1996-09-01",
"place": "Brugge",
"country": "France"
},
"nationality": "France",
"height": "179 cm",
"weight": "70 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21433.png"
},
"statistics": [
{
"team": {
"id": 92,
"name": "Nimes",
"logo": "https://media.api-sports.io/football/teams/92.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 19,
"lineups": 16,
"minutes": 1357,
"number": null,
"position": "Defender",
"rating": "6.783333",
"captain": false
},
"substitutes": {
"in": 3,
"out": 2,
"bench": 10
},
"shots": {
"total": 6,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 714,
"key": 1,
"accuracy": 35
},
"tackles": {
"total": 13,
"blocks": 12,
"interceptions": 40
},
"duels": {
"total": 125,
"won": 71
},
"dribbles": {
"attempts": 4,
"success": 3,
"past": null
},
"fouls": {
"drawn": 29,
"committed": 14
},
"cards": {
"yellow": 2,
"yellowred": 1,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 7,
"name": "A. Diallo",
"firstname": "Abdou",
"lastname": "Diallo",
"age": 25,
"birth": {
"date": "1996-05-04",
"place": "Tours",
"country": "France"
},
"nationality": "Senegal",
"height": "187 cm",
"weight": "79 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/7.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 18,
"lineups": 14,
"minutes": 1209,
"number": null,
"position": "Defender",
"rating": "7.005882",
"captain": false
},
"substitutes": {
"in": 4,
"out": 1,
"bench": 8
},
"shots": {
"total": 3,
"on": null
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 951,
"key": 1,
"accuracy": 49
},
"tackles": {
"total": 12,
"blocks": 8,
"interceptions": 22
},
"duels": {
"total": 92,
"won": 55
},
"dribbles": {
"attempts": 20,
"success": 14,
"past": null
},
"fouls": {
"drawn": 8,
"committed": 15
},
"cards": {
"yellow": 1,
"yellowred": 1,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 8694,
"name": "W. Faes",
"firstname": "Wout",
"lastname": "Faes",
"age": 23,
"birth": {
"date": "1998-04-03",
"place": null,
"country": "Belgium"
},
"nationality": "Belgium",
"height": "187 cm",
"weight": "84 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/8694.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 26,
"lineups": 26,
"minutes": 2292,
"number": null,
"position": "Defender",
"rating": "6.907692",
"captain": false
},
"substitutes": {
"in": 0,
"out": 0,
"bench": 0
},
"shots": {
"total": 5,
"on": 1
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1228,
"key": 0,
"accuracy": 43
},
"tackles": {
"total": 25,
"blocks": 24,
"interceptions": 55
},
"duels": {
"total": 164,
"won": 95
},
"dribbles": {
"attempts": 12,
"success": 10,
"past": null
},
"fouls": {
"drawn": 12,
"committed": 16
},
"cards": {
"yellow": 10,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 1907,
"name": "H. Sakai",
"firstname": "Hiroki",
"lastname": "Sakai",
"age": 31,
"birth": {
"date": "1990-04-12",
"place": "Kashiwa",
"country": "Japan"
},
"nationality": "Japan",
"height": "183 cm",
"weight": "70 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/1907.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 23,
"minutes": 2087,
"number": null,
"position": "Defender",
"rating": "6.776000",
"captain": false
},
"substitutes": {
"in": 2,
"out": 4,
"bench": 3
},
"shots": {
"total": 1,
"on": 0
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 926,
"key": 18,
"accuracy": 31
},
"tackles": {
"total": 71,
"blocks": 4,
"interceptions": 50
},
"duels": {
"total": 250,
"won": 133
},
"dribbles": {
"attempts": 21,
"success": 7,
"past": null
},
"fouls": {
"drawn": 15,
"committed": 41
},
"cards": {
"yellow": 6,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21443,
"name": "T. Savanier",
"firstname": "Téji",
"lastname": "Savanier",
"age": 30,
"birth": {
"date": "1991-12-22",
"place": "Montpellier",
"country": "France"
},
"nationality": "France",
"height": "171 cm",
"weight": "62 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21443.png"
},
"statistics": [
{
"team": {
"id": 82,
"name": "Montpellier",
"logo": "https://media.api-sports.io/football/teams/82.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 22,
"lineups": 21,
"minutes": 1738,
"number": null,
"position": "Midfielder",
"rating": "7.100000",
"captain": false
},
"substitutes": {
"in": 1,
"out": 8,
"bench": 1
},
"shots": {
"total": 33,
"on": 15
},
"goals": {
"total": 5,
"conceded": 0,
"assists": 4,
"saves": null
},
"passes": {
"total": 850,
"key": 49,
"accuracy": 30
},
"tackles": {
"total": 39,
"blocks": 4,
"interceptions": 32
},
"duels": {
"total": 322,
"won": 149
},
"dribbles": {
"attempts": 70,
"success": 41,
"past": null
},
"fouls": {
"drawn": 54,
"committed": 45
},
"cards": {
"yellow": 6,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 2,
"missed": 2,
"saved": null
}
}
]
},
{
"player": {
"id": 941,
"name": "L. Benito",
"firstname": "Loris",
"lastname": "Benito Souto",
"age": 29,
"birth": {
"date": "1992-01-07",
"place": "Aarau",
"country": "Switzerland"
},
"nationality": "Switzerland",
"height": "184 cm",
"weight": "80 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/941.png"
},
"statistics": [
{
"team": {
"id": 78,
"name": "Bordeaux",
"logo": "https://media.api-sports.io/football/teams/78.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 25,
"lineups": 24,
"minutes": 2113,
"number": null,
"position": "Defender",
"rating": "6.828000",
"captain": false
},
"substitutes": {
"in": 1,
"out": 2,
"bench": 4
},
"shots": {
"total": 6,
"on": 1
},
"goals": {
"total": 0,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 1240,
"key": 11,
"accuracy": 45
},
"tackles": {
"total": 35,
"blocks": 7,
"interceptions": 39
},
"duels": {
"total": 158,
"won": 84
},
"dribbles": {
"attempts": 2,
"success": 2,
"past": null
},
"fouls": {
"drawn": 13,
"committed": 32
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 22232,
"name": "Thiago Mendes",
"firstname": "Thiago Henrique",
"lastname": "Mendes Ribeiro",
"age": 29,
"birth": {
"date": "1992-03-15",
"place": "São Luís",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "176 cm",
"weight": "78 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/22232.png"
},
"statistics": [
{
"team": {
"id": 80,
"name": "Lyon",
"logo": "https://media.api-sports.io/football/teams/80.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 23,
"lineups": 19,
"minutes": 1813,
"number": null,
"position": "Midfielder",
"rating": "6.956521",
"captain": false
},
"substitutes": {
"in": 4,
"out": 2,
"bench": 5
},
"shots": {
"total": 15,
"on": 6
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1220,
"key": 22,
"accuracy": 46
},
"tackles": {
"total": 32,
"blocks": 6,
"interceptions": 32
},
"duels": {
"total": 157,
"won": 84
},
"dribbles": {
"attempts": 17,
"success": 11,
"past": null
},
"fouls": {
"drawn": 20,
"committed": 22
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 3080,
"name": "M. Munetsi",
"firstname": "Marshall Nyasha",
"lastname": "Munetsi",
"age": 25,
"birth": {
"date": "1996-06-22",
"place": "Bulawayo",
"country": "Zimbabwe"
},
"nationality": "Zimbabwe",
"height": "188 cm",
"weight": "83 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/3080.png"
},
"statistics": [
{
"team": {
"id": 93,
"name": "Reims",
"logo": "https://media.api-sports.io/football/teams/93.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 21,
"lineups": 15,
"minutes": 1386,
"number": null,
"position": "Midfielder",
"rating": "6.828571",
"captain": false
},
"substitutes": {
"in": 6,
"out": 3,
"bench": 9
},
"shots": {
"total": 9,
"on": 3
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 587,
"key": 7,
"accuracy": 30
},
"tackles": {
"total": 27,
"blocks": 17,
"interceptions": 51
},
"duels": {
"total": 163,
"won": 93
},
"dribbles": {
"attempts": 17,
"success": 12,
"past": null
},
"fouls": {
"drawn": 15,
"committed": 23
},
"cards": {
"yellow": 5,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 3416,
"name": "J. Boye",
"firstname": "John",
"lastname": "Boye",
"age": 34,
"birth": {
"date": "1987-04-23",
"place": "Accra",
"country": "Ghana"
},
"nationality": "Ghana",
"height": "184 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/3416.png"
},
"statistics": [
{
"team": {
"id": 112,
"name": "Metz",
"logo": "https://media.api-sports.io/football/teams/112.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 28,
"lineups": 28,
"minutes": 2456,
"number": null,
"position": "Defender",
"rating": "6.885714",
"captain": false
},
"substitutes": {
"in": 0,
"out": 3,
"bench": 0
},
"shots": {
"total": 9,
"on": 1
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 2,
"saves": null
},
"passes": {
"total": 980,
"key": 6,
"accuracy": 30
},
"tackles": {
"total": 39,
"blocks": 18,
"interceptions": 61
},
"duels": {
"total": 188,
"won": 99
},
"dribbles": {
"attempts": 3,
"success": 3,
"past": null
},
"fouls": {
"drawn": 13,
"committed": 23
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21711,
"name": "F. Sammaritano",
"firstname": "Frédéric",
"lastname": "Sammaritano",
"age": 35,
"birth": {
"date": "1986-03-23",
"place": "Vannes",
"country": "France"
},
"nationality": "France",
"height": "162 cm",
"weight": "65 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21711.png"
},
"statistics": [
{
"team": {
"id": 89,
"name": "Dijon",
"logo": "https://media.api-sports.io/football/teams/89.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 24,
"lineups": 9,
"minutes": 941,
"number": null,
"position": "Midfielder",
"rating": "6.604166",
"captain": false
},
"substitutes": {
"in": 15,
"out": 9,
"bench": 18
},
"shots": {
"total": 8,
"on": 3
},
"goals": {
"total": 0,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 322,
"key": 20,
"accuracy": 17
},
"tackles": {
"total": 15,
"blocks": 0,
"interceptions": 9
},
"duels": {
"total": 107,
"won": 49
},
"dribbles": {
"attempts": 23,
"success": 14,
"past": null
},
"fouls": {
"drawn": 18,
"committed": 12
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21499,
"name": "L. Deaux",
"firstname": "Lucas",
"lastname": "Deaux",
"age": 33,
"birth": {
"date": "1988-12-26",
"place": "Reims",
"country": "France"
},
"nationality": "France",
"height": "188 cm",
"weight": "82 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21499.png"
},
"statistics": [
{
"team": {
"id": 92,
"name": "Nimes",
"logo": "https://media.api-sports.io/football/teams/92.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 17,
"lineups": 15,
"minutes": 1347,
"number": null,
"position": "Midfielder",
"rating": "6.629411",
"captain": false
},
"substitutes": {
"in": 2,
"out": 2,
"bench": 3
},
"shots": {
"total": 10,
"on": 4
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 739,
"key": 13,
"accuracy": 41
},
"tackles": {
"total": 30,
"blocks": 3,
"interceptions": 16
},
"duels": {
"total": 178,
"won": 90
},
"dribbles": {
"attempts": 23,
"success": 16,
"past": null
},
"fouls": {
"drawn": 15,
"committed": 25
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 6,
"name": "L. Balerdi",
"firstname": "Leonardo Julián",
"lastname": "Balerdi Rossa",
"age": 22,
"birth": {
"date": "1999-01-26",
"place": "Villa Mercedes",
"country": "Argentina"
},
"nationality": "Argentina",
"height": "187 cm",
"weight": "85 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/6.png"
},
"statistics": [
{
"team": {
"id": 81,
"name": "Marseille",
"logo": "https://media.api-sports.io/football/teams/81.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 13,
"lineups": 12,
"minutes": 1004,
"number": null,
"position": "Defender",
"rating": "6.476923",
"captain": false
},
"substitutes": {
"in": 1,
"out": 1,
"bench": 16
},
"shots": {
"total": 8,
"on": 2
},
"goals": {
"total": 1,
"conceded": 0,
"assists": null,
"saves": null
},
"passes": {
"total": 561,
"key": 0,
"accuracy": 41
},
"tackles": {
"total": 14,
"blocks": 6,
"interceptions": 16
},
"duels": {
"total": 114,
"won": 48
},
"dribbles": {
"attempts": 5,
"success": 2,
"past": null
},
"fouls": {
"drawn": 13,
"committed": 21
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 276,
"name": "Neymar",
"firstname": "Neymar",
"lastname": "da Silva Santos Júnior",
"age": 29,
"birth": {
"date": "1992-02-05",
"place": "Mogi das Cruzes",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "175 cm",
"weight": "68 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/276.png"
},
"statistics": [
{
"team": {
"id": 85,
"name": "Paris Saint Germain",
"logo": "https://media.api-sports.io/football/teams/85.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 11,
"lineups": 9,
"minutes": 865,
"number": null,
"position": "Attacker",
"rating": "7.490909",
"captain": false
},
"substitutes": {
"in": 2,
"out": 0,
"bench": 2
},
"shots": {
"total": 32,
"on": 14
},
"goals": {
"total": 6,
"conceded": 0,
"assists": 3,
"saves": null
},
"passes": {
"total": 552,
"key": 32,
"accuracy": 39
},
"tackles": {
"total": 8,
"blocks": null,
"interceptions": 6
},
"duels": {
"total": 216,
"won": 111
},
"dribbles": {
"attempts": 99,
"success": 57,
"past": null
},
"fouls": {
"drawn": 43,
"committed": 17
},
"cards": {
"yellow": 4,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 3,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 21097,
"name": "Andrei Girotto",
"firstname": "Andrei",
"lastname": "Girotto",
"age": 29,
"birth": {
"date": "1992-02-17",
"place": "Bento Gonçalves",
"country": "Brazil"
},
"nationality": "Brazil",
"height": "186 cm",
"weight": "73 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/21097.png"
},
"statistics": [
{
"team": {
"id": 83,
"name": "Nantes",
"logo": "https://media.api-sports.io/football/teams/83.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 27,
"lineups": 26,
"minutes": 2282,
"number": null,
"position": "Midfielder",
"rating": "6.844444",
"captain": false
},
"substitutes": {
"in": 1,
"out": 0,
"bench": 1
},
"shots": {
"total": 20,
"on": 5
},
"goals": {
"total": 1,
"conceded": 0,
"assists": 1,
"saves": null
},
"passes": {
"total": 1278,
"key": 10,
"accuracy": 40
},
"tackles": {
"total": 58,
"blocks": 11,
"interceptions": 50
},
"duels": {
"total": 254,
"won": 157
},
"dribbles": {
"attempts": 5,
"success": 3,
"past": null
},
"fouls": {
"drawn": 21,
"committed": 25
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": null
}
}
]
},
{
"player": {
"id": 20519,
"name": "A. Oukidja",
"firstname": "Alexandre",
"lastname": "Oukidja",
"age": 33,
"birth": {
"date": "1988-07-19",
"place": "Nevers",
"country": "France"
},
"nationality": "Algeria",
"height": "184 cm",
"weight": "79 kg",
"injured": false,
"photo": "https://media.api-sports.io/football/players/20519.png"
},
"statistics": [
{
"team": {
"id": 112,
"name": "Metz",
"logo": "https://media.api-sports.io/football/teams/112.png"
},
"league": {
"id": 61,
"name": "Ligue 1",
"country": "France",
"logo": "https://media.api-sports.io/football/leagues/61.png",
"flag": "https://media.api-sports.io/flags/fr.svg",
"season": 2020
},
"games": {
"appearences": 27,
"lineups": 27,
"minutes": 2430,
"number": null,
"position": "Goalkeeper",
"rating": "6.922222",
"captain": false
},
"substitutes": {
"in": 0,
"out": 1,
"bench": 0
},
"shots": {
"total": 0,
"on": 0
},
"goals": {
"total": 0,
"conceded": 26,
"assists": null,
"saves": 69
},
"passes": {
"total": 685,
"key": 1,
"accuracy": 16
},
"tackles": {
"total": null,
"blocks": 0,
"interceptions": 0
},
"duels": {
"total": 24,
"won": 20
},
"dribbles": {
"attempts": 2,
"success": 2,
"past": null
},
"fouls": {
"drawn": 6,
"committed": 0
},
"cards": {
"yellow": 3,
"yellowred": 0,
"red": 1
},
"penalty": {
"won": null,
"commited": null,
"scored": 0,
"missed": 0,
"saved": 2
}
}
]
}
]
}
Transfers
Transfers
Get all available transfers for players and teams

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
player	
integer
The id of the player

team	
integer
The id of the team

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/transfers

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all transfers from one {player}
get("https://v3.football.api-sports.io/transfers?player=35845");

// Get all transfers from one {team}
get("https://v3.football.api-sports.io/transfers?team=463");
Response samples
200204499500
Content type
application/json

Copy
Expand allCollapse all
{
"get": "transfers",
"parameters": {
"player": "35845"
},
"errors": [ ],
"results": 1,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"player": {
"id": 35845,
"name": "Hernán Darío Burbano"
},
"update": "2020-02-06T00:08:15+00:00",
"transfers": [
{
"date": "2019-07-15",
"type": "Free",
"teams": {
"in": {
"id": 2283,
"name": "Atlas",
"logo": "https://media.api-sports.io/football/teams/2283.png"
},
"out": {
"id": 2283,
"name": "Atlas",
"logo": "https://media.api-sports.io/football/teams/2283.png"
}
}
},
{
"date": "2019-01-01",
"type": "N/A",
"teams": {
"in": {
"id": 1937,
"name": "Atletico Atlas",
"logo": "https://media.api-sports.io/football/teams/1937.png"
},
"out": {
"id": 1139,
"name": "Santa Fe",
"logo": "https://media.api-sports.io/football/teams/1139.png"
}
}
},
{
"date": "2018-07-01",
"type": "N/A",
"teams": {
"in": {
"id": 1139,
"name": "Santa Fe",
"logo": "https://media.api-sports.io/football/teams/1139.png"
},
"out": {
"id": 2289,
"name": "Leon",
"logo": "https://media.api-sports.io/football/teams/2289.png"
}
}
},
{
"date": "2015-06-11",
"type": "N/A",
"teams": {
"in": {
"id": 2289,
"name": "Leon",
"logo": "https://media.api-sports.io/football/teams/2289.png"
},
"out": {
"id": 2279,
"name": "Tigres UANL",
"logo": "https://media.api-sports.io/football/teams/2279.png"
}
}
},
{
"date": "2014-01-01",
"type": "N/A",
"teams": {
"in": {
"id": 2279,
"name": "Tigres UANL",
"logo": "https://media.api-sports.io/football/teams/2279.png"
},
"out": {
"id": 2289,
"name": "Leon",
"logo": "https://media.api-sports.io/football/teams/2289.png"
}
}
},
{
"date": "2012-01-01",
"type": "N/A",
"teams": {
"in": {
"id": 2289,
"name": "Leon",
"logo": "https://media.api-sports.io/football/teams/2289.png"
},
"out": {
"id": 1127,
"name": "Deportivo Cali",
"logo": "https://media.api-sports.io/football/teams/1127.png"
}
}
},
{
"date": "2011-01-01",
"type": "N/A",
"teams": {
"in": {
"id": 1127,
"name": "Deportivo Cali",
"logo": "https://media.api-sports.io/football/teams/1127.png"
},
"out": {
"id": 1126,
"name": "Deportivo Pasto",
"logo": "https://media.api-sports.io/football/teams/1126.png"
}
}
},
{
"date": "2020-01-01",
"type": null,
"teams": {
"in": {
"id": 1470,
"name": "Cucuta",
"logo": "https://media.api-sports.io/football/teams/1470.png"
},
"out": {
"id": 463,
"name": "Aldosivi",
"logo": "https://media.api-sports.io/football/teams/463.png"
}
}
}
]
}
]
}
Trophies
Trophies
Get all available trophies for a player or a coach.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
player	
integer
The id of the player

players	
stringMaximum of 20 players ids
Value: "id-id-id"
One or more players ids

coach	
integer
The id of the coach

coachs	
stringMaximum of 20 coachs ids
Value: "id-id-id"
One or more coachs ids

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/trophies

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all trophies from one {player}
get("https://v3.football.api-sports.io/trophies?player=276");

// Get all trophies from several {player} ids
get("https://v3.football.api-sports.io/trophies?players=276-278");

// Get all trophies from one {coach}
get("https://v3.football.api-sports.io/trophies?coach=2");

// Get all trophies from several {coach} ids
get("https://v3.football.api-sports.io/trophies?coachs=2-6");
Response samples
200204499500
Content type
application/json
Example

Default
Default

Copy
Expand allCollapse all
{
"get": "trophies",
"parameters": {
"player": "276"
},
"errors": [ ],
"results": 38,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"league": "Sudamericano U20",
"country": "South-America",
"season": "Peru 2011",
"place": "Winner"
},
{
"league": "Trophée des Champions",
"country": "France",
"season": "2019/2020",
"place": "Winner"
},
{
"league": "Copa America",
"country": "South-America",
"season": "2019 Brazil",
"place": "Winner"
},
{
"league": "Ligue 1",
"country": "France",
"season": "2018/2019",
"place": "Winner"
},
{
"league": "Coupe de France",
"country": "France",
"season": "2018/2019",
"place": "2nd Place"
},
{
"league": "Trophée des Champions",
"country": "France",
"season": "2018/2019",
"place": "Winner"
},
{
"league": "Ligue 1",
"country": "France",
"season": "2017/2018",
"place": "Winner"
},
{
"league": "Coupe de France",
"country": "France",
"season": "2017/2018",
"place": "Winner"
},
{
"league": "Coupe de la Ligue",
"country": "France",
"season": "2017/2018",
"place": "Winner"
},
{
"league": "La Liga",
"country": "Spain",
"season": "2016/2017",
"place": "2nd Place"
}
]
}
Sidelined
Sidelined
Get all available sidelined for a player or a coach.

Update Frequency : This endpoint is updated several times a week.

Recommended Calls : 1 call per day.

query Parameters
player	
integer
The id of the player

players	
stringMaximum of 20 players ids
Value: "id-id-id"
One or more players ids

coach	
integer
The id of the coach

coachs	
stringMaximum of 20 coachs ids
Value: "id-id-id"
One or more coachs ids

header Parameters
x-apisports-key
required
string
Your Api-Key

Responses
200 OK
204 No Content
499 Time Out
500 Internal Server Error

get
/sidelined

Request samples
Use CasesPhpPythonNodeJavaScriptCurlRuby

Copy
// Get all from one {player}
get("https://v3.football.api-sports.io/sidelined?player=276");

// Get all from several {player} ids
get("https://v3.football.api-sports.io/sidelined?players=276-278-279-280-281-282");

// Get all from one {coach}
get("https://v3.football.api-sports.io/sidelined?coach=2");

// Get all from several {coach} ids
get("https://v3.football.api-sports.io/sidelined?coachs=2-6-44-77-54-52");
Response samples
200204499500
Content type
application/json
Example

Default
Default

Copy
Expand allCollapse all
{
"get": "sidelined",
"parameters": {
"player": "276"
},
"errors": [ ],
"results": 27,
"paging": {
"current": 1,
"total": 1
},
"response": [
{
"type": "Suspended",
"start": "2020-02-26",
"end": "2020-03-01"
},
{
"type": "Hip/Thigh Injury",
"start": "2020-02-02",
"end": "2020-02-10"
},
{
"type": "Groin/Pelvis Injury",
"start": "2019-10-11",
"end": "2019-11-20"
},
{
"type": "Ankle/Foot Injury",
"start": "2019-08-01",
"end": "2019-08-23"
},
{
"type": "Suspended",
"start": "2019-05-15",
"end": "2019-05-27"
},
{
"type": "Ankle/Foot Injury",
"start": "2019-01-24",
"end": "2019-04-20"
},
{
"type": "Groin Strain",
"start": "2018-12-03",
"end": "2019-01-02"
},
{
"type": "Groin Strain",
"start": "2018-11-21",
"end": "2018-11-27"
},
{
"type": "Broken Toe",
"start": "2018-02-26",
"end": "2018-05-20"
},
{
"type": "Thigh Muscle Strain",
"start": "2018-01-20",
"end": "2018-01-25"
},
{
"type": "Rib Injury",
"start": "2018-01-11",
"end": "2018-01-16"
},
{
"type": "Suspended",
"start": "2017-12-05",
"end": "2017-12-11"
},
{
"type": "Thigh Muscle Strain",
"start": "2017-11-03",
"end": "2017-11-15"
},
{
"type": "Suspended",
"start": "2017-10-23",
"end": "2017-10-28"
},
{
"type": "Ankle/Foot Injury",
"start": "2017-09-21",
"end": "2017-09-25"
},
{
"type": "Suspended",
"start": "2017-04-09",
"end": "2017-04-27"
},
{
"type": "Suspended",
"start": "2016-12-04",
"end": "2016-12-11"
},
{
"type": "Suspended",
"start": "2016-03-04",
"end": "2016-03-07"
},
{
"type": "Hamstring",
"start": "2016-01-21",
"end": "2016-01-26"
},
{
"type": "Hamstring",
"start": "2015-12-08",
"end": "2015-12-16"
},
{
"type": "Virus",
"start": "2015-08-09",
"end": "2015-08-26"
},
{
"type": "Suspended",
"start": "2015-03-01",
"end": "2015-03-09"
},
{
"type": "Sprained Ankle",
"start": "2014-08-22",
"end": "2014-08-29"
},
{
"type": "Vertebral Fracture",
"start": "2014-07-05",
"end": "2014-08-05"
},
{
"type": "Ankle/Foot Injury",
"start": "2014-04-17",
"end": "2014-05-10"
},
{
"type": "Sprained Ankle",
"start": "2014-01-17",
"end": "2014-02-14"
},
{
"type": "Suspended",
"start": "2013-12-15",
"end": "2013-12-23"
}
]
}