"use strict";
const agentPrompt = `You are a content design expert creating engaging and coherent content. Your content aligns with the style guide and learning and recovery guidance. You generate strings for titles, descriptions, subheaders, buttons, and assist with text recommendations. You are supportive, empathetic, encouraging, goal-oriented, trustworthy, and proactive. You are talking to a person who is curious, innovative, creative, and motivated.
Your Responsibilities:
Create clear, concise, and engaging content.
Ensure all content aligns with the Microsoft Writing Style Guide.
Understand and address the user's needs and pain points to create a supportive and encouraging user experience.
Voice and Tone for Azure:
Professional and Authoritative: Convey expertise and reliability to build trust with users who rely on the product for critical tasks.
Clear and Concise: Ensure technical content is straightforward and easy to understand. Avoid jargon, idioms, and complex sentences that might confuse users.
Helpful and Supportive: Use a friendly and approachable tone to make users feel supported and encouraged to explore the product's features.
Engaging and Motivating: Maintain an engaging tone to keep users interested and motivated to learn more about the product and its capabilities.
Consistent: Maintain a consistent voice and tone across all communication channels, including documentation, marketing materials, and customer support.
Please reference official Microsoft Azure documentation.`;
const guidelines = `You are a Microsoft Azure Content Design Expert. Your role is to generate or refine text for UI elements based on the input provided (e.g., existing copy from a Figma element).
You also specialize in Azure Kubernetes Service (AKS), Azure Kubernetes Service Automatic, and Azure Kubernetes Fleet Manager.
Principles
Follow these principles at all times:
Clarity first: Use plain, concise, and direct language. Avoid jargon unless it’s an Azure or cloud-native concept customers expect.
Customer-focused: Speak to the customer’s task, goal, or problem. Prioritize action-oriented, helpful guidance.
Consistency with Azure Portal: Use the established patterns and terminology of the Azure portal (e.g., “Create,” “Select,” “Review + create,” “Subscription,” “Resource group”). Follow Azure’s naming conventions.
Voice & tone: Professional but approachable. Be confident, empathetic, and helpful. Avoid being overly casual, verbose, or promotional.
Guideline alignment: Use Microsoft’s style guide and Azure content standards:
Sentence case for UI labels (e.g., “Select region”).
Action verbs for buttons and instructions (e.g., “Create,” “Save,” “Delete,” not “OK” or “Submit”).
Avoid unnecessary articles (“the,” “a”) when they clutter.
Keep tooltips and helper text short, scannable, and task-oriented and to one line only.
Examples
Input: {"kubernetesClusterTitle":"Kubernetes cluster","kubernetesClusterSubheader":"AKS Cluster","kubernetesClusterDescription":"add description here","createKubernetesClusterButtonText":"Create button"}
Output: {"kubernetesClusterTitle":"Kubernetes services","kubernetesClusterSubheader":"Azure Kubernetes service","kubernetesClusterDescription":"Deploy and manage scalable containerized applications with customizable controls, automated orchestration, upgrades, and scaling.","createKubernetesClusterButtonText":"Create AKS cluster"}
Your cluster must have a provisioning state of 'Succeeded', 'Cancelled', or 'Failed' to be eligible for Fleet management. For AKS clusters, they must be in a running power state. For Arc clusters, they must have a connected connectivity status. Clusters created using a Service Principal are not supported. Additionally, clusters that are already members of another Fleet cannot be selected. To check your cluster's status, please visit its overview page.
`;
figma.showUI(__html__, { width: 450, height: 320 });
figma.ui.onmessage = (msg) => {
    if (msg.type === 'submit') {
        figma.loadAllPagesAsync().then(() => {
            const selectedNodes = figma.currentPage.selection;
            const allTextNodes = [];
            for (const node of selectedNodes) {
                // Check if the node supports findAll (e.g., FrameNode, GroupNode, etc.)
                if ("findAll" in node) {
                    const nestedTextNodes = node.findAll(n => n.type === "TEXT");
                    allTextNodes.push(...nestedTextNodes);
                }
                if (node.type === "TEXT") {
                    allTextNodes.push(node);
                }
            }
            const figmaContent = new Map();
            allTextNodes.map(node => figmaContent.set(node.name, node.characters));
            const figmaContentJSON = JSON.stringify(Object.fromEntries(figmaContent));
            console.log("current figma text: " + figmaContentJSON);
            fetch("https://iaasexp-aml-workspace-aoai.openai.azure.com/openai/responses?api-version=2025-04-01-preview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer 828ab105d0c8483db9ef77ecd5ea433b`
                },
                body: JSON.stringify({
                    input: `${agentPrompt}\nThe next few lines will contain content guidelines to follow.\n${guidelines}\nThe next line will contain content that the user need suggestions for in JSON format. Do not update the keys, only update the values which contains the content if there are suggested changes and only return the updated JSON.\n${figmaContentJSON}`,
                    model: "gpt-5-mini"
                })
            }).then((response) => {
                response.json().then(data => {
                    console.log("response: " + data.output[1].content[0].text);
                    const suggestedContentJSON = JSON.parse(data.output[1].content[0].text);
                    const suggestedContent = new Map();
                    for (const [key, value] of Object.entries(suggestedContentJSON)) {
                        suggestedContent.set(key, value);
                    }
                    allTextNodes.forEach(node => {
                        figma.loadFontAsync(node.fontName).then(() => {
                            if (suggestedContent.has(node.name)) {
                                node.deleteCharacters(0, node.characters.length);
                                node.insertCharacters(0, suggestedContent.get(node.name));
                            }
                        }).catch((e) => {
                            console.log(e);
                            console.log('Error loading fonts');
                            figma.closePlugin();
                        });
                    });
                }).catch((e) => {
                    console.log('Error reading response', e);
                    figma.closePlugin();
                });
            }).catch(() => {
                console.log('Error fetching suggested content');
                figma.closePlugin();
            }).finally(() => {
                figma.ui.postMessage({ type: 'fetch-success' });
                console.log('Content generated successfully');
            });
        }).catch(() => {
            console.log('Error loading pages');
            figma.closePlugin();
        });
    }
    else {
        console.log('Cancelled by user');
        figma.closePlugin();
    }
};
// // This plugin will open a window to prompt the user to enter a number, and
// // it will then create that many rectangles on the screen.
// // This file holds the main code for plugins. Code in this file has access to
// // the *figma document* via the figma global object.
// // You can access browser APIs in the <script> tag inside "ui.html" which has a
// // full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).
// // This shows the HTML page in "ui.html".
// figma.showUI(__html__);
// // Calls to "parent.postMessage" from within the HTML page will trigger this
// // callback. The callback will be passed the "pluginMessage" property of the
// // posted message.
// figma.ui.onmessage =  (msg: {type: string, count: number}) => {
//   // One way of distinguishing between different types of messages sent from
//   // your HTML page is to use an object with a "type" property like this.
//   if (msg.type === 'create-shapes') {
//     // This plugin creates rectangles on the screen.
//     const numberOfRectangles = msg.count;
//     const nodes: SceneNode[] = [];
//     for (let i = 0; i < numberOfRectangles; i++) {
//       const rect = figma.createEllipse();
//       rect.x = i * 150;
//       rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
//       figma.currentPage.appendChild(rect);
//       nodes.push(rect);
//     }
//     figma.currentPage.selection = nodes;
//     figma.viewport.scrollAndZoomIntoView(nodes);
//   }
//   // Make sure to close the plugin when you're done. Otherwise the plugin will
//   // keep running, which shows the cancel button at the bottom of the screen.
//   figma.closePlugin();
// };
// if (figma.command === 'textreview') {
//   figma.on('textreview', ({ text }: any) => {
//     if (!text) {
//       return [];
//     }
//     const patterns = [
//       { regex: /Azure/g, suggestion: 'azure', color: 'GREEN' }
//     ];
//     const matches = patterns.flatMap((pattern: { regex: RegExp; suggestion: string; color: string; }) =>
//       Array.from(text.matchAll(pattern.regex)).map(match => ({
//         start: match.index,
//         end: match.index + match[0].length,
//         suggestions: [pattern.suggestion],
//         color: pattern.color,
//       }))
//     );
//     return matches;
//   });
// } else if (!figma.textreview?.isEnabled) {
//   figma.textreview?.requestToBeEnabledAsync()
//     .then(() => {
//       console.log('I am now the default!');
//     })
//     .catch(() => {
//       console.log('User declined to enable this plugin.');
//     })
//     .finally(() => {
//       figma.closePlugin();
//     });
// } else {
//   figma.closePlugin();
// }
// figma.loadAllPagesAsync();
// const text = figma.variables.getLocalVariablesAsync("STRING")
//   .then((variables) => {
//     let count = 0;
//     variables.forEach(async variable => {
//       console.log(variable.valuesByMode);
//       console.log(variable.id);
//       const collection = variable.variableCollectionId;
//       console.log(collection);
//       const newtext = figma.createText();
//       newtext.x = 0;
//       newtext.y = 150 + count * 50;
//       count++;
//       await figma.loadFontAsync({ family: "Inter", style: "Regular" });
//       newtext.characters = variable.valuesByMode["7:0"] as string;
//       newtext.fontSize = 24;
//       newtext.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
//       figma.currentPage.appendChild(newtext);
//     });
//   })
//   .catch(() => {
//     console.log('cannot retrieve variables');
//     figma.closePlugin();
//   });
// messages: [
//   {
//     role: "user",
//     content: "I am going to Paris, what should I see?"
//   },
//         // { role: "system", content: `${agentPrompt} \n Reference the Microsoft Writing Style Guide and the PRD for all content creation: \n ${microsoftWritingStyleGuide} \n ${prdContent}` },
//         // { role: "user", content: `I need content for the following JSON: ${figmaContentJSON}` }
// ],
// fetch("https://vr3p3qiclce2i-cog.openai.azure.com/openai/responses?api-version=2025-04-01-preview", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//     "Authorization": `Bearer 5b2dfd56eb0d4d1eb3d0cf97e54e7c58`
//   },
//   body: JSON.stringify({
//     messages: [
//       {
//         role: "user",
//         content: "I am going to Paris, what should I see?"
//       },
//       // { role: "system", content: `${agentPrompt} \n Reference the Microsoft Writing Style Guide and the PRD for all content creation: \n ${microsoftWritingStyleGuide} \n ${prdContent}` },
//       // { role: "user", content: `I need content for the following JSON: ${figmaContentJSON}` }
//     ],
//     max_completion_tokens: 16384,
//     model: "gpt-5-mini"
//   })
// }).then((response) => {
//   console.log(response);
//   figma.loadFontAsync({ family: "Inter", style: "Regular" }).then(() => {
//     allTextNodes.forEach(node => {
//       if (suggestedContent.has(node.name)) {
//         node.deleteCharacters(0, node.characters.length);
//         node.insertCharacters(0, suggestedContent.get(node.name) as string);
//       }
//     });
//     console.log('Content generated successfully');
//     figma.closePlugin();
//   }).catch(() => {
//     console.log('Error loading fonts');
//     figma.closePlugin();
//   });
// }).catch(() => {
//   console.log('Error fetching suggested content');
//   figma.closePlugin();
// });
//   onmessage = async (event) => {
//     const msg = event.data.pluginMessage;
//     if (msg.type === 'make-api-call') {
//       const response = await fetch("https://iaasexp-aml-workspace-aoai.openai.azure.com/openai/responses?api-version=2025-04-01-preview", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer 828ab105d0c8483db9ef77ecd5ea433b`
//           },
//           body: JSON.stringify({
//             input: "I am going to Paris, what should I see?",
//             model: "gpt-5-mini"
//           })
//       });
//       const data = await response.json();
//       parent.postMessage({ pluginMessage: { type: 'api-response', data } }, '*');
//     }
// };
