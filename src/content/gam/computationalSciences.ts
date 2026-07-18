import type { GamPassage } from '../../engine/types';

/** Computational-sciences seed passages — 100% original content, format
 *  modeled on the official GAM preparatory samples (passage teaches →
 *  questions apply). */
export const COMPUTATIONAL_PASSAGES: GamPassage[] = [
  {
    id: 'cs-search-complexity',
    topicArea: 'computational-sciences',
    title: 'Searching Ordered and Unordered Data',
    difficulty: 'easy',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `Searching a collection for one particular item is among the most frequent tasks a computer performs. The simplest method is **linear search**: examine the items one after another, from the first position to the last, until the target is found or the list is exhausted. Linear search makes no assumption about how the data is arranged. In the **worst case** — the target sits in the last position, or is not present at all — a list of $n$ items requires $n$ comparisons.

**Binary search** is far faster, but it has a strict precondition: the list must already be **sorted**. The algorithm compares the target with the middle element. On a match the search ends; if the target is smaller, the entire upper half of the list is discarded; if it is larger, the lower half is discarded. Each comparison therefore at least halves the number of remaining candidates, leaving at most $n/2^k$ of them after $k$ comparisons. In this passage we use the resulting rule: the worst case of binary search equals the **smallest whole number $k$ with $2^k \\ge n$**, which is roughly $\\log_2 n$. The sortedness requirement is essential. On unsorted data, discarding half the list may throw away the half that actually contains the target, so binary search can return a wrong answer.

The table shows worst-case comparison counts for three list sizes. For example, $2^{10} = 1024$, so ten comparisons suffice for 1024 items, and $2^{20} = 1048576$ is the first power of two to reach one million.

| $n$ | Linear search (worst case) | Binary search (worst case) |
|---|---|---|
| 8 | 8 | 3 |
| 1024 | 1024 | 10 |
| 1,000,000 | 1,000,000 | 20 |

Computer scientists summarise such growth with **Big-O notation**, which records only how the cost scales as $n$ grows: linear search is $O(n)$, binary search is $O(\\log n)$. The practical consequence is dramatic. When $n$ **doubles**, the worst case of linear search doubles as well, but binary search needs only **one additional comparison**, because $2^{k+1} = 2 \\cdot 2^k$.

Speed has a price, however: the data must be kept sorted, and sorting is itself expensive — typical sorting methods need on the order of $n \\log_2 n$ steps, far more than a single search. For a **one-off** search of unsorted data it is therefore usually faster to scan linearly than to sort first. Binary search pays off when the **same sorted list is searched many times**, so that the one-time sorting cost is spread over many fast searches.`,
    questions: [
      {
        id: 'cs-search-complexity-q1',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, why can binary search not be applied reliably to an unsorted list?',
        options: [
          'Because discarding half of the list is only justified when the elements are in order, so on unsorted data the discarded half may contain the target',
          'Because unsorted lists cannot be accessed by position, so the middle element cannot be located',
          'Because binary search works only when the number of elements is exactly a power of two',
          'Because two elements of an unsorted list cannot be compared with each other',
        ],
        correct: 0,
        explanation:
          'Binary search discards the half of the list that cannot contain the target, and that inference relies on the elements being sorted; on unsorted data the discarded half may hold the target, so a wrong answer can be returned. The middle element of any list can be located by position whether or not the list is sorted, and individual comparisons remain perfectly possible on unsorted data — it is the discarding step, not the comparing step, that needs order. The halving rule also works for any list size, not just powers of two.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.concept'],
      },
      {
        id: 'cs-search-complexity-q2',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'medium',
        seed: 0,
        stem: 'A sorted list is replaced by one twice as long, and the worst cases of the two search methods are measured again. What does the passage predict?',
        options: [
          'The linear-search worst case doubles, while binary search needs only about one additional comparison',
          'The worst cases of linear search and binary search each double',
          'The linear-search worst case doubles, while the binary-search worst case is halved',
          'The linear-search worst case gains one comparison, while the binary-search worst case doubles',
        ],
        correct: 0,
        explanation:
          'Linear search is $O(n)$, so doubling $n$ doubles its worst case, while binary search is $O(\\log n)$: because $2^{k+1} = 2 \\cdot 2^k$, a single extra comparison absorbs a doubling of the list. Expecting each worst case to double treats binary search as if it also grew linearly with $n$; a halved binary worst case would require the list to shrink, not grow; and the swapped pairing attributes the logarithmic behaviour to the wrong method.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.concept'],
      },
      {
        id: 'cs-search-complexity-q3',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'medium',
        seed: 0,
        stem: 'A sorted register contains 4096 entries. Using the rule given in the passage, what is the worst-case number of comparisons binary search needs to look up one entry?',
        options: ['12', '64', '2048', '4096'],
        correct: 0,
        lockOptionOrder: true,
        explanation:
          'The rule takes the smallest whole number $k$ with $2^k \\ge 4096$, and since $2^{12} = 4096$, twelve comparisons suffice in the worst case. The value 4096 is the linear-search worst case and ignores that the register is sorted; 2048 halves the list only once instead of halving it repeatedly; and 64 is the square root of 4096, which confuses repeated halving with taking a square root.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.compute'],
      },
      {
        id: 'cs-search-complexity-q4',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the comparison-count table, for a list of 1,000,000 items the binary-search worst case is smaller than the linear-search worst case by roughly what factor?',
        options: ['About 20 times', 'About 5,000 times', 'About 50,000 times', 'About 500,000 times'],
        correct: 2,
        lockOptionOrder: true,
        explanation:
          'The table lists 1,000,000 comparisons for linear search against 20 for binary search, and $1000000 / 20 = 50000$, so binary search is about 50,000 times cheaper in the worst case. A factor of 500,000 divides by 2 instead of by 20, a factor of 5,000 misplaces the result by one power of ten, and 20 is the binary-search comparison count itself rather than the ratio between the two methods.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.read-chart'],
      },
      {
        id: 'cs-search-complexity-q5',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'medium',
        seed: 0,
        stem: "A sorted database grows from 1,000,000 records to 2,000,000 records. Following the passage's rule, how does the worst case of binary search change?",
        options: [
          'It stays at exactly 20 comparisons',
          'It rises by one comparison, from 20 to 21',
          'It doubles, from 20 to 40 comparisons',
          'It rises to 2,000,000 comparisons',
        ],
        correct: 1,
        lockOptionOrder: true,
        explanation:
          'For 1,000,000 records the smallest $k$ with $2^k \\ge n$ is 20, and for 2,000,000 records it is 21, because $2^{20} = 1048576$ falls short of two million while $2^{21} = 2097152$ reaches it — doubling the data adds exactly one comparison. The count cannot stay at 20, since $2^{20}$ no longer covers all records; doubling to 40 wrongly assumes the worst case grows in proportion to $n$; and 2,000,000 comparisons is the worst case of linear search, not of binary search.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.compute'],
      },
      {
        id: 'cs-search-complexity-q6',
        type: 'gam',
        passageId: 'cs-search-complexity',
        difficulty: 'medium',
        seed: 0,
        stem: 'A warehouse receives a one-off, unsorted list of 10,000 part numbers and must check whether one specific part number appears on it. The list will never be used again. According to the passage, what is the most efficient approach?',
        options: [
          'Scan the list linearly, because sorting it first would cost far more than the single search saves',
          'Sort the list first and then use binary search, because binary search is always the faster method overall',
          'Sort the list first, because sorting needs only about $\\log_2 n$ steps',
          'Run binary search directly on the unsorted list, because 10,000 items is small enough for the sortedness requirement to be ignored',
        ],
        correct: 0,
        explanation:
          'A single linear scan needs at most 10,000 comparisons, while sorting first costs on the order of $n \\log_2 n$ steps — well over 100,000 here — which one search can never repay; the passage states that binary search pays off when the same sorted list is searched many times, not once. Claiming that sorting needs about $\\log_2 n$ steps confuses the cost of sorting with the cost of a single binary search, and running binary search on unsorted data may discard the half containing the target regardless of how small the list is.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'cs-graph-shortest-path',
    topicArea: 'computational-sciences',
    title: 'Graphs, Traversal, and Shortest Paths',
    difficulty: 'medium',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `Many everyday structures — road networks, data networks, social connections — can be modelled as a **graph**: a set of **vertices** (nodes) joined by **edges** (links). Two vertices are **adjacent** if an edge joins them directly, and the **degree** of a vertex is the number of edges attached to it. A **path** is a sequence of vertices in which each consecutive pair is adjacent; its **length in edges** is simply the number of edges it uses. In a **weighted graph** every edge additionally carries a number, its **weight** — a distance, a cost, or a travel time — and the **total weight** of a path is the sum of the weights of its edges.

Two standard strategies explore a graph systematically from a chosen start vertex. **Breadth-first search (BFS)** works outward in layers: it first visits every vertex one edge away from the start, then every vertex two edges away, and so on. It manages the exploration frontier with a **queue** (first in, first out). Because it expands strictly in order of edge distance, BFS reaches every vertex by a path with the **fewest possible edges**. **Depth-first search (DFS)** does the opposite: it follows a single path deeper and deeper until it can go no further, then **backtracks** to the most recent junction and tries the next branch — behaviour that corresponds to a **stack** (last in, first out). DFS also visits every reachable vertex, but the route by which it first reaches a vertex may be far from the shortest.

In a weighted graph, "shortest" normally means **minimum total weight**, and here a common mistake lurks: the path with the fewest edges is **not necessarily** the path with the least weight, because a route of many light edges can undercut a route of few heavy ones. To find a minimum-weight path by hand, list the candidate routes systematically, add up the weights along each, and keep the smallest total.

{{fig:graph-net}}

Consider the weighted graph in the figure. Vertex A is adjacent to B and C, and vertex F can be reached only through D or E. Between A and E the contrast between the two notions of "short" is directly visible: the two-edge path A–C–E has total weight $5 + 8 = 13$, while the four-edge path A–B–C–D–E has total weight $2 + 2 + 3 + 2 = 9$ — more edges, yet less weight. The questions below ask you to read the figure, compare the two traversal strategies, and determine fewest-edge and minimum-weight paths between given vertices.`,
    figures: [
      {
        id: 'graph-net',
        svg: `<svg viewBox="0 0 460 310" role="img" aria-label="Weighted graph with six vertices"><g stroke="currentColor" stroke-width="1.5" fill="none"><line x1="66.2" y1="138.2" x2="143.8" y2="81.8" /><line x1="66.2" y1="161.8" x2="143.8" y2="218.2" /><line x1="160" y1="90" x2="160" y2="210" /><line x1="176.8" y1="80.8" x2="268.2" y2="139.2" /><line x1="176.8" y1="219.2" x2="268.2" y2="160.8" /><line x1="179.5" y1="234.5" x2="290.5" y2="260.5" /><line x1="289.2" y1="169.5" x2="305.8" y2="245.5" /><line x1="303.4" y1="157.8" x2="396.6" y2="197.2" /><line x1="327.4" y1="255.1" x2="397.6" y2="214.9" /></g><g fill="#A3195B" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"><circle cx="50" cy="150" r="16" /><circle cx="160" cy="70" r="16" /><circle cx="160" cy="230" r="16" /><circle cx="285" cy="150" r="16" /><circle cx="310" cy="265" r="16" /><circle cx="415" cy="205" r="16" /></g><g fill="currentColor" font-size="14" font-weight="600" text-anchor="middle"><text x="50" y="155">A</text><text x="160" y="75">B</text><text x="160" y="235">C</text><text x="285" y="155">D</text><text x="310" y="270">E</text><text x="415" y="210">F</text></g><g fill="currentColor" font-size="12" text-anchor="middle"><text x="98" y="100">2</text><text x="97" y="203">5</text><text x="147" y="154">2</text><text x="227" y="99">6</text><text x="228" y="204">3</text><text x="231" y="264">8</text><text x="313" y="207">2</text><text x="352" y="164">7</text><text x="372" y="250">3</text></g></svg>`,
        caption:
          'An undirected weighted graph with six vertices A–F; the number on each edge is its weight.',
        alt: 'Undirected graph with vertices A, B, C, D, E and F. The weighted edges are: A–B with weight 2, A–C with weight 5, B–C with weight 2, B–D with weight 6, C–D with weight 3, C–E with weight 8, D–E with weight 2, D–F with weight 7, and E–F with weight 3.',
      },
    ],
    questions: [
      {
        id: 'cs-graph-shortest-path-q1',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'medium',
        seed: 0,
        stem: 'Which statement correctly contrasts breadth-first search (BFS) with depth-first search (DFS)?',
        options: [
          'BFS explores all vertices at the current edge distance before going deeper and uses a queue, while DFS follows one path as far as possible before backtracking and corresponds to a stack',
          'DFS explores all vertices at the current edge distance before going deeper, while BFS follows one path as far as possible before backtracking',
          'BFS can be applied only to weighted graphs, while DFS can be applied only to unweighted graphs',
          'BFS always visits fewer vertices in total than DFS does when run on the same graph',
        ],
        correct: 0,
        explanation:
          'The passage describes BFS as expanding in layers — every vertex one edge away, then two, and so on — managed by a queue, and DFS as pushing one path as deep as possible before backtracking, which corresponds to a stack. Assigning the layer-by-layer behaviour to DFS swaps the two strategies; neither method is restricted to weighted or unweighted graphs; and since each strategy visits every reachable vertex, neither one systematically visits fewer vertices than the other.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.concept'],
      },
      {
        id: 'cs-graph-shortest-path-q2',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'easy',
        seed: 0,
        stem: 'How many vertices and how many edges does the graph in the figure contain?',
        options: [
          '6 vertices and 9 edges',
          '6 vertices and 8 edges',
          '5 vertices and 9 edges',
          '9 vertices and 6 edges',
        ],
        correct: 0,
        explanation:
          'Counting in the figure gives six vertices, labelled A to F, and nine edges: A–B, A–C, B–C, B–D, C–D, C–E, D–E, D–F and E–F. Eight edges misses one of the nine connections, five vertices overlooks one of the labelled nodes, and nine vertices with six edges swaps the two counts.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.read-chart'],
      },
      {
        id: 'cs-graph-shortest-path-q3',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'easy',
        seed: 0,
        stem: 'What is the degree of vertex D in the figure?',
        options: ['3', '4', '9', '18'],
        correct: 1,
        lockOptionOrder: true,
        explanation:
          'Vertex D is joined by an edge to each of B, C, E and F, so its degree — the number of edges attached to it — is 4. A degree of 3 overlooks one of the four incident edges, 9 is the number of edges in the whole graph rather than at D, and 18 is the sum of the weights of the edges at D, $6 + 3 + 2 + 7$, which counts weights instead of edges.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.read-chart'],
      },
      {
        id: 'cs-graph-shortest-path-q4',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'medium',
        seed: 0,
        stem: 'The passage states that BFS reaches every vertex by a path with the fewest possible edges. In the figure, how many edges does a fewest-edge path from A to F contain?',
        options: ['2', '3', '5', '9'],
        correct: 1,
        lockOptionOrder: true,
        explanation:
          "F's only neighbours are D and E, and neither of them is adjacent to A, so no path from A to F can use just two edges; A–C–D–F (and likewise A–B–D–F and A–C–E–F) reaches F in three edges, which is therefore the minimum. Five edges describes routes such as A–B–C–D–E–F that optimise total weight rather than edge count, and nine is the number of edges in the whole graph, not the length of a path.",
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.compute'],
      },
      {
        id: 'cs-graph-shortest-path-q5',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'hard',
        seed: 0,
        stem: 'What is the minimum total weight of a path from A to F in the figure?',
        options: ['12', '13', '14', '15'],
        correct: 0,
        lockOptionOrder: true,
        explanation:
          'Listing the routes systematically, the five-edge path A–B–C–D–E–F has total weight $2 + 2 + 3 + 2 + 3 = 12$, and no alternative beats it. A total of 13 comes from A–B–D–E–F ($2 + 6 + 2 + 3$) or A–C–D–E–F ($5 + 3 + 2 + 3$), and 14 from A–B–C–D–F ($2 + 2 + 3 + 7$) — each of these routes skips one of the cheap legs. A total of 15 belongs to the three-edge routes A–C–D–F ($5 + 3 + 7$) and A–B–D–F ($2 + 6 + 7$), which assumes the fewest-edge path must also be the lightest.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.compute'],
      },
      {
        id: 'cs-graph-shortest-path-q6',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'medium',
        seed: 0,
        stem: 'In a weighted graph, is the path with the fewest edges always also the path with the minimum total weight?',
        options: [
          'No — a path with more edges can have a smaller total weight, as the routes from A to E in the figure show',
          'Yes — every additional edge adds weight, so fewer edges always means less total weight',
          'Yes — BFS reaches every vertex by a fewest-edge path, and that path is always the minimum-weight path as well',
          'No — but such a mismatch can occur only when at least one edge has a negative weight',
        ],
        correct: 0,
        explanation:
          "The figure disproves the claim as a general rule: from A to E, the two-edge path A–C–E has total weight $5 + 8 = 13$, while the four-edge path A–B–C–D–E has total weight $2 + 2 + 3 + 2 = 9$. The idea that every extra edge must raise the total ignores that individual weights differ — many light edges can undercut a few heavy ones. BFS guarantees the fewest edges, not the least weight, so invoking it for weighted shortest paths misapplies its guarantee. And no negative weights are needed: every weight in the figure is positive, yet the mismatch still occurs.",
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.concept'],
      },
      {
        id: 'cs-graph-shortest-path-q7',
        type: 'gam',
        passageId: 'cs-graph-shortest-path',
        difficulty: 'medium',
        seed: 0,
        stem: 'A metro app models stations as vertices, direct connections as edges, and travel minutes as edge weights. One setting minimises the number of stations passed; another minimises total travel time. Based on the passage, which statement is correct?',
        options: [
          'Minimising stations corresponds to a fewest-edge path and minimising travel time to a minimum-weight path, and the two settings can recommend different routes',
          'The two settings always recommend the same route, because passing fewer stations always takes less time',
          'Minimising stations corresponds to a minimum-weight path and minimising travel time to a fewest-edge path',
          'The number of stations passed cannot be modelled with a graph, because graphs can represent physical distances only',
        ],
        correct: 0,
        explanation:
          "Each station passed corresponds to traversing one edge, so minimising stations is a fewest-edge problem, while total travel time is the sum of edge weights, a minimum-weight problem — and the passage's example from A to E shows a fewest-edge route (weight 13) losing to a route with more edges (weight 9), so the two settings can disagree. Claiming they always coincide repeats the fallacy that fewer edges means less weight, and pairing stations with weights and minutes with edge counts inverts the two criteria. A graph's weights can encode any quantity, including time, not just physical distance.",
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.computational-sciences', 'gam.skill.transfer'],
      },
    ],
  },
];
