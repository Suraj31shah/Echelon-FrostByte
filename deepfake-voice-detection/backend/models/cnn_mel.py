import torch
import torch.nn as nn
import torch.optim as optim
import time
import os

class DeepfakeCNN(nn.Module):
    """
    Lightweight CNN for Deepfake Voice Detection using Mel-spectrograms.
    
    Architecture:
    - 4 Convolutional Blocks (Conv -> BN -> ReLU -> MaxPool)
    - Global Average Pooling (to handle variable time lengths)
    - Fully Connected Classifier
    
    Input: (Batch, 1, n_mels, time_steps)
    Output: Logits (use sigmoid for probability)
    """
    def __init__(self, n_mels=128):
        super(DeepfakeCNN, self).__init__()
        
        # Block 1
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        # Block 2
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        # Block 3
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.bn3 = nn.BatchNorm2d(64)
        self.pool3 = nn.MaxPool2d(2, 2)
        
        # Block 4
        self.conv4 = nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1)
        self.bn4 = nn.BatchNorm2d(128)
        self.pool4 = nn.MaxPool2d(2, 2)
        
        # Global Pooling
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Classifier
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(64, 1)
        )
        
        self.activation = nn.ReLU()
    
    def forward(self, x):
        """
        Forward pass.
        x shape: (Batch, 1, n_mels, time)
        returns: (Batch, 1) logits
        """
        x = self.pool1(self.activation(self.bn1(self.conv1(x))))
        x = self.pool2(self.activation(self.bn2(self.conv2(x))))
        x = self.pool3(self.activation(self.bn3(self.conv3(x))))
        x = self.pool4(self.activation(self.bn4(self.conv4(x))))
        
        x = self.global_pool(x)
        x = self.fc(x)
        return x

    def predict(self, x):
        """
        Inference method returning probability.
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            prob = torch.sigmoid(logits)
        return prob.item()

    def save(self, path):
        torch.save(self.state_dict(), path)

    def load(self, path):
        self.load_state_dict(torch.load(path, map_location=torch.device('cpu')))

def train_model(model, train_loader, val_loader, epochs=10, lr=0.001, device='cpu'):
    """
    Standard training loop.
    """
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    model.to(device)
    
    print(f"Starting training on {device}...")
    
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device).float().unsqueeze(1)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs}, Loss: {running_loss/len(train_loader):.4f}")
        
    print("Training complete.")
    return model

if __name__ == "__main__":
    # Quick sanity check
    model = DeepfakeCNN()
    dummy_input = torch.randn(1, 1, 128, 300) # (B, C, F, T)
    output = model(dummy_input)
    print(f"Model output shape: {output.shape}") 
