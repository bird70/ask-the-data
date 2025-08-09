---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: Fine-tuning OpenAI GPT-OSS20B for Cybersecurity with PEFT/LoRA
date: 2025-08-09
categories:
  - ai
  - machine-learning
  - cybersecurity
tags:
  - openai
  - gpt-oss
  - fine-tuning
  - peft
  - lora
  - transformers
  - cybersecurity
  - llm
toc: true
toc_sticky: true
excerpt: "Learn how to fine-tune OpenAI's GPT-OSS20B model using PEFT/LoRA techniques with a cybersecurity dataset, creating a locally runnable specialized LLM."
header:
  teaser: /assets/images/gpt-oss-finetuning.jpg
---

# Fine-tuning OpenAI GPT-OSS20B for Cybersecurity Applications

With the release of OpenAI's GPT-OSS20B (OpenAI gpt-oss-20b), we now have access to a powerful open-source language model that can be fine-tuned for specialized applications. In this post, I'll walk through an experiment I wanted to make: fine-tuning this model using Parameter-Efficient Fine-Tuning (PEFT) with Low-Rank Adaptation (LoRA) techniques, specifically targeting defensive cybersecurity use cases. This process should be small enough to run on a single GPU, making it accessible for many practitioners and researchers.

## Motivation: Why Fine-tune for Defensive Cybersecurity?

The cybersecurity domain presents unique challenges for general-purpose language models:

- **Domain-specific terminology** and concepts that may not be well-represented in general training data
- **Technical accuracy requirements** for security recommendations and threat analysis
- **Privacy concerns** when using cloud-based APIs for sensitive security data
- **Cost considerations** for organizations processing large volumes of security logs and reports

By fine-tuning a locally runnable model, we can address these challenges while maintaining control over our data and reducing operational costs.

## The Approach: PEFT/LoRA Fine-tuning

Parameter-Efficient Fine-Tuning (PEFT) with LoRA allows us to adapt large language models without modifying all parameters. This approach:

- **Reduces computational requirements** compared to full fine-tuning
- **Maintains the base model's general capabilities** while adding domain expertise
- **Enables faster training** and lower memory usage
- **Allows multiple specialized adapters** to be swapped in and out

## Dataset: Trendyol Cybersecurity LLM

For this fine-tuning exercise, we'll use the cybersecurity dataset from [Trendyol's Cybersecurity LLM](https://huggingface.co/Trendyol/Trendyol-Cybersecurity-LLM-Qwen3-32B-Q8_0-GGUF), which provides high-quality cybersecurity-focused training examples.
**Note: Please make sure you read the permitted uses for this dataset**

## Implementation

Following the methodology outlined in the [OpenAI GPT-OSS fine-tuning cookbook](https://cookbook.openai.com/articles/gpt-oss/fine-tune-transfomers), here's how to implement PEFT/LoRA fine-tuning:

### Environment Setup

First, let's set up our environment with the necessary dependencies:

```python
# Install required packages
!pip install transformers datasets peft accelerate bitsandbytes torch

import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import load_dataset
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

### Model and Tokenizer Loading

```python
# Model configuration
MODEL_NAME = "openai/gpt-oss-20b"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# Load base model with quantization for memory efficiency
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    load_in_8bit=True,  # Use 8-bit quantization to reduce memory usage
    trust_remote_code=True
)

logger.info(f"Model loaded on device: {model.device}")
```

### LoRA Configuration

```python
# Configure LoRA parameters
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    inference_mode=False,
    r=16,  # Low-rank dimension
    lora_alpha=32,  # LoRA scaling parameter
    lora_dropout=0.1,
    target_modules=[
        "q_proj",
        "k_proj", 
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj"
    ]  # Target attention and MLP layers
)

# Apply LoRA to the model
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
```

### Dataset Preparation

```python
def prepare_cybersecurity_dataset():
    """
    Load and prepare the cybersecurity dataset.
    This function adapts the Trendyol cybersecurity dataset format.
    """
    # Load dataset (replace with actual dataset loading logic)
    # Note: The Trendyol dataset may require specific formatting
    
    dataset = load_dataset("json", data_files="cybersecurity_data.jsonl")
    
    def format_prompt(example):
        """Format examples for instruction following"""
        if "instruction" in example and "response" in example:
            prompt = f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['response']}"
        elif "question" in example and "answer" in example:
            prompt = f"### Question:\n{example['question']}\n\n### Answer:\n{example['answer']}"
        else:
            # Fallback formatting
            prompt = f"### Input:\n{example.get('input', '')}\n\n### Output:\n{example.get('output', '')}"
        
        return {"text": prompt}
    
    # Apply formatting
    dataset = dataset.map(format_prompt)
    
    return dataset

# Prepare dataset
dataset = prepare_cybersecurity_dataset()
```

### Tokenization

```python
def tokenize_function(examples):
    """Tokenize the dataset for training"""
    tokens = tokenizer(
        examples["text"],
        truncation=True,
        padding=False,
        max_length=512,  # Adjust based on your needs
        return_overflowing_tokens=False,
    )
    return tokens

# Tokenize the dataset
tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    remove_columns=dataset["train"].column_names,
    desc="Tokenizing dataset"
)

# Split dataset
train_dataset = tokenized_dataset["train"]
if "validation" in tokenized_dataset:
    eval_dataset = tokenized_dataset["validation"]
else:
    # Create validation split if not present
    split_dataset = train_dataset.train_test_split(test_size=0.1)
    train_dataset = split_dataset["train"]
    eval_dataset = split_dataset["test"]
```

### Training Configuration

```python
# Training arguments
training_args = TrainingArguments(
    output_dir="./gpt-oss-cybersecurity-lora",
    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,
    gradient_accumulation_steps=8,
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    eval_steps=100,
    save_steps=500,
    evaluation_strategy="steps",
    save_strategy="steps",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    warmup_steps=100,
    lr_scheduler_type="cosine",
    report_to=None,  # Disable wandb/tensorboard for this example
    remove_unused_columns=False,
)

# Data collator for language modeling
data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False,  # We're doing causal language modeling, not masked LM
)

# Initialize trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    tokenizer=tokenizer,
)
```

### Training Process

```python
# Start training
logger.info("Starting training...")
trainer.train()

# Save the final model
logger.info("Saving model...")
trainer.save_model()
tokenizer.save_pretrained("./gpt-oss-cybersecurity-lora")

logger.info("Training completed!")
```

### Model Inference

```python
def generate_cybersecurity_response(prompt, max_length=256):
    """Generate response using the fine-tuned model"""
    
    # Format the prompt
    formatted_prompt = f"### Instruction:\n{prompt}\n\n### Response:\n"
    
    # Tokenize input
    inputs = tokenizer(formatted_prompt, return_tensors="pt").to(model.device)
    
    # Generate response
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Decode and return response
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract just the generated part
    generated_text = response[len(formatted_prompt):]
    
    return generated_text.strip()

# Example usage
cybersecurity_query = "What are the key indicators of a potential SQL injection attack?"
response = generate_cybersecurity_response(cybersecurity_query)
print(f"Query: {cybersecurity_query}")
print(f"Response: {response}")
```

## Local Deployment

Once training is complete, you can deploy the model locally:

```python
from peft import PeftModel

def load_fine_tuned_model(base_model_path, lora_adapter_path):
    """Load the fine-tuned model for inference"""
    
    # Load base model
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_path,
        torch_dtype=torch.float16,
        device_map="auto",
        load_in_8bit=True
    )
    
    # Load LoRA adapter
    model = PeftModel.from_pretrained(base_model, lora_adapter_path)
    
    return model

# Load the fine-tuned model
fine_tuned_model = load_fine_tuned_model(
    MODEL_NAME, 
    "./gpt-oss-cybersecurity-lora"
)

# Now you can use fine_tuned_model for cybersecurity-specific tasks
```

## Usage Examples
# 1. Install dependencies
```bash
pip install -r requirements.txt
```

# 2. Create sample config and dataset
```bash
python fine_tune_gpt_oss_cybersecurity.py --create-sample-config
python fine_tune_gpt_oss_cybersecurity.py --create-sample-dataset sample_data.jsonl
```

# 3. Train the model
```bash
python fine_tune_gpt_oss_cybersecurity.py --config config.yaml --dataset sample_data.jsonl
```

# 4. Run inference
```bash
python fine_tune_gpt_oss_cybersecurity.py --inference ./gpt-oss-cybersecurity-lora --prompt "What is a DDoS attack?"
```

## Benefits and Use Cases

The fine-tuned cybersecurity model can be used for:

1. **Threat Analysis**: Analyzing security logs and identifying potential threats
2. **Incident Response**: Providing guidance during security incidents
3. **Security Policy Generation**: Creating security policies and procedures
4. **Vulnerability Assessment**: Helping identify and prioritize vulnerabilities
5. **Security Training**: Generating educational content for security awareness

## Performance Considerations

When deploying locally, consider:

- **Hardware requirements**: The 20B parameter model requires significant GPU memory
- **Quantization options**: Use 4-bit or 8-bit quantization for smaller deployments
- **Batch processing**: Process multiple queries efficiently
- **Caching strategies**: Cache frequent responses to improve performance

## Conclusion

Fine-tuning OpenAI's GPT-OSS20B with PEFT/LoRA provides a powerful approach to creating specialized cybersecurity models that can run locally. This approach offers the benefits of domain specialization while maintaining data privacy and reducing operational costs.

The combination of the robust base model, efficient fine-tuning techniques, and high-quality cybersecurity datasets creates a powerful tool for organizations looking to enhance their security capabilities with AI. 

The code provided in this post serves as a starting point for your own fine-tuning experiments. [See my [code repo at](https://github.com/bird70/finetune-gpt-oss-cybersecurity)] Feel free to adapt and extend it based on your specific needs and datasets.

## References

1. [OpenAI GPT-OSS Fine-tuning Guide](https://cookbook.openai.com/articles/gpt-oss/fine-tune-transfomers)
2. [Trendyol Cybersecurity LLM Dataset](https://huggingface.co/Trendyol/Trendyol-Cybersecurity-LLM-Qwen3-32B-Q8_0-GGUF)
3. [PEFT Library Documentation](https://huggingface.co/docs/peft/index)
4. [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)

---

**Note**: This implementation assumes access to appropriate computational resources and datasets. Adjust batch sizes, sequence lengths, and other parameters based on your available hardware and specific requirements.
Please make sure to follow the permitted uses for the Trendyol dataset and any other datasets you use in your fine-tuning process.

This example is for educational purposes and may require further adjustments based on your specific use case and environment.