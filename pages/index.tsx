import { Inter } from '@next/font/google'
import React, { useState } from "react";
import Graph from 'app/graph'
import { gql, useQuery, useLazyQuery } from '@apollo/client'
import styles from "../styles/Home.module.css";
import useSWR from 'swr'
import client from 'apollo/client'
import { Node, Edge } from 'app/graph'
import SBOMViewer from '@/app/sbom';
import { IsDependency,  GetPkgQuery, GetPkgQueryVariables, PkgSpec , GetPkgDocument, AllPkgTreeFragment, Package} from '../gql/__generated__/graphql';

const inter = Inter({ subsets: ['latin'] });

// TODO (mlieberman85): Some of the below still requires type definitions.

// TODO (mlieberman85): Change this query to use the generated code
const TEST_QUERY = gql`
fragment allIsDependencyTree on IsDependency {
  justification
  package {
    type
    namespaces {
      namespace
      names {
        name
        versions {
          version
          qualifiers {
            key
            value
          }
          subpath
        }
      }
    }
  }
dependentPackage {
      type
    namespaces {
      namespace
      names {
        name
        versions {
          version
          qualifiers {
            key
            value
          }
          subpath
        }
      }
    }
  }
versionRange
origin
collector
}

query Q1 {
  IsDependency(isDependencySpec: {}) {
    ...allIsDependencyTree
  }
}`;


const processDataForCytoscape = (data) => {
  console.log("GQL DATA:", data);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  data.packages.forEach((p :Package, index) => {
    const sourceNodeId = `pkg-${index}`;
    const targetNodeId = `depPkg-${index}`;

    // Create nodes for package and dependentPackage
    nodes.push(
      {
        data: { 
          id: p.id, 
          label: p.type + "." + p.namespaces[0].namespace + "." + p.namespaces[0].names[0].name,
          type: "package",
        },
      }
    );

  });


  return { nodes, edges };
};


export default function Home() {
  // TODO (mlieberman85): Validate if SWR is better in this use case than alternatives like react query
  const [detailsText, setDetailsText] = useState("detailsText");
  const [inputText, setInputText] = useState(`{
    "type":"deb",
    "namespace":"ubuntu",
    "name": "dpkg",
    "qualifiers": [{"key":"arch", "value":"amd64"}]
  }`);
  const [buttonHit, setButtonHit] = useState(false);
  const [requested, setRequested] = useState("{}");
  const [data, setData] = useState<GetPkgQuery>({ packages: []});


  function initGraph (s : string) {
    client.query({
      query: GetPkgDocument,
      variables: {
        spec: JSON.parse(requested),
      }
    }).then( res => {
      console.log("res data", res.data);
      setData(res.data);
    });
  }

  function writeDetailsHandler (x : any) {
    setDetailsText(JSON.stringify(x,null,2));

  }

    

  

  //const { data, error } = useSWR(TEST_QUERY, fetcher)
  //if (error) return <div>failed to load</div>
  if (!data) return <div>loading...</div>
  return (
    <>
      <div>
        <h1>GUAC Visualizer</h1>
        <textarea name="text" rows={15} cols={50} value={inputText} onChange={e => setInputText(e.target.value)} />
        <button onClick={e => initGraph(inputText)}>submit</button>
        <textarea name="details-text" rows={15} cols={50} value={JSON.stringify(data)} onChange={() => {}} />

        <textarea name="details-text" rows={15} cols={50} value={detailsText} onChange={e => setDetailsText(e.target.value)}/>
        <div
          style={{
            border: "1px solid",
            backgroundColor: "#000000"
          }}
        >
          {/* skip sending in data which will be delegated to the graph object by passing in a way to retrieve the data instead */}
          <Graph layout="cola" writeDetails={writeDetailsHandler} graphData={processDataForCytoscape(data)} />
        </div>
      </div>
      <SBOMViewer onSelect={null}/>
    </>
  )
}