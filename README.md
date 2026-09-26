# EdgeOnEdge

*Data Studies: EdgeOnEdge, September 2026*

If you have designed schemas, you know the usual order: decide the tables, columns and types,
agree on a class hierarchy, then load data that fits. EdgeOnEdge tries the opposite order.
Files come in as they are — logs, a hosts file, a DNS zone, a nursery receipt, a party plan —
and the structure you would normally declare up front is read off the data afterwards, by
whoever is looking.

```sh
node eoe.ts                                     # build demo/pile.eoe, walk it at http://localhost:8788
node eoe.ts more.eoe                            # the same, with lines from anywhere else unioned in
node cut.ts cutters/hosts.tsv demo/raw/hosts    # what one table says about one file
node check/drift.ts --save; node check/drift.ts # remember the walk's answers, then see what moved
```

Node 24 runs the TypeScript as it is: no build step, no dependencies.

## The same data, two ways

Take one address that three files mention:

```text
hosts file   10.2.14.7    backup-03.corp   backup-03
DNS zone     backup-03.corp.   IN  A  10.2.14.7
auth log     Sep 18 09:02:44 build-01 sshd[1290]: Accepted password for tomas from 10.2.14.7 port 60211
```

In a schema you would design `hosts(ip, name)`, `dns_records(name, type, value)` and
`log_entries(time, host, program, …)`, pick a type for each column, and write the joins
between them. Here, each file is cut into pieces, and each piece is linked to the text it
was found in:

```text
"10.2.14.7    backup-03.corp   backup-03"  ──▶  "10.2.14.7"        tagged ip, address
"backup-03.corp.   IN  A  10.2.14.7"       ──▶  "10.2.14.7"        tagged ip, address
"Sep 18 09:02:44 build-01 sshd[1290]: …"   ──▶  "10.2.14.7"        tagged ip, from
```

The three lines meet because they contain the same string. There is no foreign key to
declare: identical bytes are the same node, so the join is already there when you walk it —
from the login, to the machine it came from, to its name in DNS.

## Your concepts, translated

| You know | Here | What changes |
|---|---|---|
| **a column's type** | a tag on one occurrence: `10.2.14.7` *is an ip in that line* | a value can carry several types — `18` is a day in one line and a port in another — and none is declared ahead |
| **a row** | a piece of a file, with the things found inside it | a row is also a value: the zone line is a part of the zone file and the whole of its ip |
| **a join / foreign key** | the same string appearing in two places | joins come from the data, including between files that were never designed together |
| **a namespace** | a vocabulary: IT's `host` and the party plan's `host` are different words | homonyms stay apart; a vocabulary also works as a filter you switch on and off |
| **a class hierarchy** | the *tower*: `ip` sits under `address` | it can be **said** by someone (`broader address = ip host`) or **seen** in the data (every string found as `vault-note` is also found as `notes`); the page marks which |
| **metadata columns** (source, created-by) | more tags: every link is tagged with the table that found it | provenance is data like any other, and can be tagged in turn |
| **a migration** | a new cutter table, or a new version of one | old lines stay valid; a version bump changes only the "said by" tag |
| **a constraint** | only well-formedness: a line is three strings, and an id means one line | data that fits no pattern is kept as text, not rejected |

Underneath, everything is one shape — a line of three strings, `[left, middle, right]`, whose
middle is a hash of its two ends. A line from a piece of text is a *link* (its right was
found inside its left). A line from another line's middle is a *tag* on that line, and tags
can be tagged too: that is how a word gets its role, its language, its source, and how a step
in the tower says what it means.

## Why give up the schema

- **The sources do not agree on one.** A hosts file, a DNS export and a receipt were never
  designed together. A schema has to pick one view of them before anyone asks a question;
  here each reader can hold their own, and the data does not change.
- **Type and value are positions, not categories.** `account` is the type of `root` and an
  instance of `identity`. In a class system those are different layers; here they are the
  same kind of string, one step apart.
- **Structure you discover is still structure.** The page builds the hierarchy from what the
  data shows, adds what someone claims, and marks the difference. How broad a word is
  depends on today's data, and moves as more arrives.

What you give up is real: data is not checked against a shape when it arrives, a query is a
walk rather than a `SELECT`, and a hierarchy discovered from a small pile includes
coincidences (in the demo every city happens to be an argument to a shell script). The page
shows those as they are, marked *seen*, rather than hiding them.

## Walking it

Start from a type (`ip`). Each column is one step from a column to its left — down into a
piece, or up to what contains it — and each row keeps the evidence for its join. The search
box sits over the first column and holds that column only: type `paris` and the kinds list
keeps the types that have it, and a reading keeps the rows whose first cell does. Switches on the left filter by vocabulary; a click on a cell shows the file lines
it was read from, and a double-click starts a new reading from that one string.

## How the pieces fit

Each raw file names what it is on its first line (`eoe: zone-file`). The tables in
`cutters/` recognize files and cut them, tagging what they find with words from their
vocabulary. The files in `tunings/` add filters, tower claims and display names.

```text
core/       lines: identity, parse, union, check, index
middle/     the pile by position: links, tags, ends
display/    the column walk, and display names
cascade.ts  cutting (cut.ts runs one table on one file)     tune.ts   the tunings, as lines
produce.ts  the shapes of line every producer writes        eoe.ts    build the pile, serve
check/      layers.sh (the layers point one way), drift.ts (the walk's answers, compared)
```

## Where it wants to go

- **Identity from tags.** A set of tags that picks out one thing — "the 2021 linksys router"
  — is a name for it, readable when ids are not. Two files describing the same thing with
  different strings could meet on overlapping tags, not only on identical bytes.
- **Graded hierarchy.** "95% of X is inside Y" instead of all or none, once the data is big
  enough for coincidences to wash out.
- **Recognition by content**, so tables know a zone file when they see one instead of
  reading the hint line.
- **Big files.** Each piece currently repeats its whole file's text; large files will need a
  shorter reference.
