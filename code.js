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
