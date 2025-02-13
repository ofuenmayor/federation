import { buildSupergraphSchema, extractSubgraphsFromSupergraph } from "..";


test('handles types having no fields referenced by other objects in a subgraph correctly', () => {
  /*
   * The following supergraph has been generated on version-0.x from:
   *  - ServiceA:
   *      type Query {
   *        q: A
   *      }
   *
   *      type A {
   *        a: B
   *      }
   *
   *      type B {
   *        b: C @provides(fields: "c")
   *      }
   *
   *      type C {
   *        c: String
   *      }
   *  - ServiceB:
   *      type C {
   *        c: String
   *      }
   *  - ServiceC:
   *      type D {
   *        d: String
   *      }
   *
   * The general idea being that all types are "value types" so ends with no 'join__type' in the supergraph (so
   * `extractSubgraphsFromSupergraph` will have to initially assume that all types are in all subgraphs), but
   * due to the `@provides`, `B.b` has a `join__field`, which makes it be only in "ServiceA". As as result,
   * type `B` will end up empty in both "ServiceB" and "ServiceC" and will need to be removed, which has to
   * trickle to removing type `A` too (since it's only field mentions `B`). This later part wasn't always done
   * correctly, resulting in errors being throws and it is what this test checks.
   */
  const supergraph = `
    schema
      @core(feature: "https://specs.apollo.dev/core/v0.2"),
      @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION)
    {
      query: Query
    }

    directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

    directive @join__field(graph: join__Graph, provides: join__FieldSet, requires: join__FieldSet) on FIELD_DEFINITION

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

    directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

    type A {
      a: B
    }

    type B {
      b: C @join__field(graph: SERVICEA, provides: \"c\")
    }

    type C {
      c: String
    }

    type D {
      d: String
    }

    type Query {
      q: A
    }

    enum core__Purpose {
      """
      \`EXECUTION\` features provide metadata necessary to for operation execution.
      """
      EXECUTION

      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
    }

    scalar join__FieldSet

    enum join__Graph {
      SERVICEA @join__graph(name: "serviceA" url: "")
      SERVICEB @join__graph(name: "serviceB" url: "")
      SERVICEC @join__graph(name: "serviceC" url: "")
    }
  `;

  const schema = buildSupergraphSchema(supergraph)[0];
  const subgraphs = extractSubgraphsFromSupergraph(schema);
  expect(subgraphs.size()).toBe(3);

  const [a, b, c] = subgraphs.values().map((s) => s.schema);
  expect(a.type('A')).toBeDefined();
  expect(a.type('B')).toBeDefined();

  expect(b.type('A')).toBeUndefined();
  expect(b.type('B')).toBeUndefined();

  expect(c.type('A')).toBeUndefined();
  expect(c.type('B')).toBeUndefined();
})

test('handles types having no fields referenced by other interfaces in a subgraph correctly', () => {
  /*
   *
   * The following supergraph has been generated on version-0.x from:
   *  - ServiceA:
   *      type Query {
   *        q: A
   *      }
   *
   *      interface A {
   *        a: B
   *      }
   *
   *      type B {
   *        b: C @provides(fields: "c")
   *      }
   *
   *      type C {
   *        c: String
   *      }
   *  - ServiceB:
   *      type C {
   *        c: String
   *      }
   *  - ServiceC:
   *      type D {
   *        d: String
   *      }
   *
   * This tests is almost identical to the 'handles types having no fields referenced by other objects in a subgraph correctly'
   * one, except that the reference to the type being removed is in an interface, to make double-sure this case is
   * handled as well.
   */
  const supergraph = `
    schema
      @core(feature: "https://specs.apollo.dev/core/v0.2"),
      @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION)
    {
      query: Query
    }

    directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

    directive @join__field(graph: join__Graph, provides: join__FieldSet, requires: join__FieldSet) on FIELD_DEFINITION

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

    directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

    interface A {
      a: B
    }

    type B {
      b: C @join__field(graph: SERVICEA, provides: "c")
    }

    type C {
      c: String
    }

    type D {
      d: String
    }

    type Query {
      q: A
    }

    enum core__Purpose {
      """
      \`EXECUTION\` features provide metadata necessary to for operation execution.
      """
      EXECUTION

      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
    }

    scalar join__FieldSet

    enum join__Graph {
      SERVICEA @join__graph(name: "serviceA" url: "")
      SERVICEB @join__graph(name: "serviceB" url: "")
      SERVICEC @join__graph(name: "serviceC" url: "")
    }
  `;

  const schema = buildSupergraphSchema(supergraph)[0];
  const subgraphs = extractSubgraphsFromSupergraph(schema);
  expect(subgraphs.size()).toBe(3);

  const [a, b, c] = subgraphs.values().map((s) => s.schema);
  expect(a.type('A')).toBeDefined();
  expect(a.type('B')).toBeDefined();

  expect(b.type('A')).toBeUndefined();
  expect(b.type('B')).toBeUndefined();

  expect(c.type('A')).toBeUndefined();
  expect(c.type('B')).toBeUndefined();
})

test('handles types having no fields referenced by other unions in a subgraph correctly', () => {
  /*
   *
   * The following supergraph has been generated on version-0.x from:
   *  - ServiceA:
   *      type Query {
   *        q: A
   *      }
   *
   *      union A = B | C
   *
   *      type B {
   *        b: D @provides(fields: "d")
   *      }
   *
   *      type C {
   *        c: D @provides(fields: "d")
   *      }
   *
   *      type D {
   *        d: String
   *      }
   *  - ServiceB:
   *      type D {
   *        d: String
   *      }
   *
   * This tests is similar identical to 'handles types having no fields referenced by other objects in a subgraph correctly'
   * but the reference to the type being removed is a union, one that should be fully removed.
   */
  const supergraph = `
    schema
      @core(feature: "https://specs.apollo.dev/core/v0.2"),
      @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION)
    {
      query: Query
    }

    directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

    directive @join__field(graph: join__Graph, provides: join__FieldSet, requires: join__FieldSet) on FIELD_DEFINITION

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

    directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

    union A = B | C

    type B {
      b: D @join__field(graph: SERVICEA, provides: "d")
    }

    type C {
      c: D @join__field(graph: SERVICEA, provides: "d")
    }

    type D {
      d: String
    }

    type Query {
      q: A
    }

    enum core__Purpose {
      """
      \`EXECUTION\` features provide metadata necessary to for operation execution.
      """
      EXECUTION

      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
    }

    scalar join__FieldSet

    enum join__Graph {
      SERVICEA @join__graph(name: "serviceA" url: "")
      SERVICEB @join__graph(name: "serviceB" url: "")
    }
  `;

  const schema = buildSupergraphSchema(supergraph)[0];
  const subgraphs = extractSubgraphsFromSupergraph(schema);
  expect(subgraphs.size()).toBe(2);

  const [a, b] = subgraphs.values().map((s) => s.schema);
  expect(a.type('A')).toBeDefined();
  expect(a.type('B')).toBeDefined();
  expect(a.type('C')).toBeDefined();
  expect(a.type('D')).toBeDefined();

  expect(b.type('A')).toBeUndefined();
  expect(b.type('B')).toBeUndefined();
  expect(b.type('C')).toBeUndefined();
  expect(a.type('D')).toBeDefined();
})

test('handles types having only some of their fields removed in a subgraph correctly', () => {
  /*
   * The following supergraph has been generated on version-0.x from:
   *  - ServiceA:
   *      type Query {
   *        q: A
   *      }
   *
   *      type A {
   *        a: B
   *      }
   *
   *      type B {
   *        b: C @provides(fields: "c")
   *        c: Int
   *      }
   *
   *      type C {
   *        c: String
   *      }
   *  - ServiceB:
   *      type C {
   *        c: String
   *      }
   *  - ServiceC:
   *      type D {
   *        d: String
   *      }
   *
   * This tests is similar identical to 'handles types having no fields referenced by other objects in a subgraph correctly'
   * but where no all of B type fields are "removed" and so the type should be preserved. So it's a "negative" version of
   * that prior test of sorts.
   */
  const supergraph = `
    schema
      @core(feature: "https://specs.apollo.dev/core/v0.2"),
      @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION)
    {
      query: Query
    }

    directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

    directive @join__field(graph: join__Graph, provides: join__FieldSet, requires: join__FieldSet) on FIELD_DEFINITION

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

    directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

    type A {
      a: B
    }

    type B {
      b: C @join__field(graph: SERVICEA, provides: "c")
      c: Int
    }

    type C {
      c: String
    }

    type D {
      d: String
    }

    type Query {
      q: A
    }

    enum core__Purpose {
      """
      \`EXECUTION\` features provide metadata necessary to for operation execution.
      """
      EXECUTION

      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
    }

    scalar join__FieldSet

    enum join__Graph {
      SERVICEA @join__graph(name: "serviceA" url: "")
      SERVICEB @join__graph(name: "serviceB" url: "")
      SERVICEC @join__graph(name: "serviceC" url: "")
    }
  `;

  const schema = buildSupergraphSchema(supergraph)[0];
  const subgraphs = extractSubgraphsFromSupergraph(schema);
  expect(subgraphs.size()).toBe(3);

  const [a, b, c] = subgraphs.values().map((s) => s.schema);
  expect(a.type('A')).toBeDefined();
  expect(a.type('B')).toBeDefined();

  // Do note that the fact that A and B are extracted in subgraph 'c' and 'd' is, in a way, "wrong" since
  // those subgraphs didn't had those type originally, but nothing in the supergraph allows to make that
  // decision so this simply assert the actuall code behaviour.

  expect(b.type('A')).toBeDefined();
  expect(b.type('B')).toBeDefined();

  expect(c.type('A')).toBeDefined();
  expect(c.type('B')).toBeDefined();
})
