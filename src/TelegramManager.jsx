import React, { useState, useEffect, useRef } from 'react';
import { Upload, Users, MessageCircle, Download, Send, Check, X, Loader, Phone, Lock } from 'lucide-react';

const API_BASE = 'https://telegrambot-c8id.onrender.com';

const TelegramManager = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  // Participants state
  const [groupId, setGroupId] = useState('');
  const [participantLimit, setParticipantLimit] = useState(100);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Messaging state
  const [messageText, setMessageText] = useState('');
  const [messageResults, setMessageResults] = useState([]);
  const [messagingLoading, setMessagingLoading] = useState(false);
  
  // CSV import state
  const [csvData, setCsvData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  const fileInputRef = useRef(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/status`);
      const data = await response.json();
      setIsAuthenticated(data.connected);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const initiateLogin = async () => {
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (data.success) {
        setShowVerificationForm(true);
        alert('Verification code sent to your phone!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Failed to send code: ' + error.message);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      alert('Please enter the verification code');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: verificationCode, password })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setShowVerificationForm(false);
        alert('Authentication successful!');
      } else {
        alert('Verification failed: ' + data.error);
      }
    } catch (error) {
      alert('Verification failed: ' + error.message);
    }
  };

  const disconnect = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSession: true })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(false);
        setShowVerificationForm(false);
        alert('Disconnected successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Failed to disconnect: ' + error.message);
    }
  };

  const getParticipants = async () => {
    if (!groupId) {
      alert('Please enter a group ID');
      return;
    }

    setParticipantsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/groups/${encodeURIComponent(groupId)}/participants?limit=${participantLimit}`);
      const data = await response.json();

      if (data.success) {
        setParticipants(data.participants);
      } else {
        alert('Error: ' + data.error);
        setParticipants([]);
      }
    } catch (error) {
      alert('Failed to get participants: ' + error.message);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const exportParticipants = async () => {
    if (!groupId) {
      alert('Please enter a group ID');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/groups/${encodeURIComponent(groupId)}/participants/export?limit=${participantLimit}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `participants_${groupId}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert('Export failed: ' + data.error);
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    setCsvLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      }).filter(row => Object.values(row).some(val => val)); // Filter out empty rows

      setCsvData(data);
      setSelectedUsers(data.map((_, index) => index)); // Select all by default
    } catch (error) {
      alert('Failed to parse CSV: ' + error.message);
    } finally {
      setCsvLoading(false);
    }
  };

  const toggleUserSelection = (index) => {
    setSelectedUsers(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(csvData.map((_, index) => index));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const sendMessages = async () => {
    if (!messageText) {
      alert('Please enter a message');
      return;
    }

    let userIdentifiers = [];

    if (csvData.length > 0 && selectedUsers.length > 0) {
      // Use selected users from CSV
      userIdentifiers = selectedUsers.map(index => {
        const user = csvData[index];
        // Try to find username or id field
        return user.username || user.id || user.user_id || user.identifier || Object.values(user)[0];
      }).filter(id => id);
    }

    if (userIdentifiers.length === 0) {
      alert('No valid user identifiers found. Please import a CSV file and select users.');
      return;
    }

    setMessagingLoading(true);
    try {
      const response = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifiers, message: messageText })
      });

      const data = await response.json();

      if (data.success) {
        setMessageResults(data.results);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Failed to send messages: ' + error.message);
    } finally {
      setMessagingLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">📱 Telegram Group Manager</h1>
          <p className="text-blue-100">Manage your Telegram groups with CSV import and bulk messaging</p>
        </div>

        <div className="p-6">
          {/* Authentication Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Authentication Status
            </h3>

            {!isAuthenticated && !showVerificationForm && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={initiateLogin}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Send Code
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isAuthenticated && showVerificationForm && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code:</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="12345"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password (if 2FA enabled):</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={verifyCode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Verify
                </button>
              </div>
            )}

            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <p className="text-green-600 font-medium">✅ Successfully authenticated!</p>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Group Participants Section */}
              <div className="p-6 bg-gray-50 rounded-xl border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Group Participants
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group ID:</label>
                    <input
                      type="text"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      placeholder="-1234567890"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Limit:</label>
                    <input
                      type="number"
                      value={participantLimit}
                      onChange={(e) => setParticipantLimit(e.target.value)}
                      min="1"
                      max="1000"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={getParticipants}
                      disabled={participantsLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {participantsLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                      Get Participants
                    </button>
                    <button
                      onClick={exportParticipants}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {participants.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-y-auto border rounded-lg bg-white">
                    <div className="p-3 bg-gray-100 border-bottom font-medium">
                      Participants ({participants.length})
                    </div>
                    {participants.map((participant, index) => (
                      <div key={index} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {participant.first_name} {participant.last_name}
                          </div>
                          {participant.username && (
                            <div className="text-sm text-gray-600">@{participant.username}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">ID: {participant.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CSV Import & Messaging Section */}
              <div className="space-y-6">
                {/* CSV Import */}
                <div className="p-6 bg-gray-50 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import CSV
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={csvLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                      >
                        {csvLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {csvFile ? csvFile.name : 'Choose CSV file'}
                      </button>
                    </div>

                    {csvData.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Users ({csvData.length})</span>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllUsers}
                              className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Select All
                            </button>
                            <button
                              onClick={deselectAllUsers}
                              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto border rounded-lg bg-white">
                          {csvData.map((user, index) => (
                            <div key={index} className="p-2 border-b last:border-b-0 flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(index)}
                                onChange={() => toggleUserSelection(index)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 text-sm">
                                {user.username || user.id || user.user_id || user.identifier || Object.values(user)[0]}
                                {user.first_name && (
                                  <span className="text-gray-500 ml-2">
                                    ({user.first_name} {user.last_name})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {selectedUsers.length} of {csvData.length} users selected
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Send Messages */}
                <div className="p-6 bg-gray-50 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Send Messages
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={4}
                        placeholder="Hello! This is a test message."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <button
                      onClick={sendMessages}
                      disabled={messagingLoading || selectedUsers.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {messagingLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send to {selectedUsers.length} Users
                    </button>
                  </div>

                  {messageResults.length > 0 && (
                    <div className="mt-4 max-h-64 overflow-y-auto border rounded-lg bg-white">
                      <div className="p-3 bg-gray-100 border-bottom font-medium">
                        Message Results
                      </div>
                      {messageResults.map((result, index) => (
                        <div key={index} className={`p-3 border-b last:border-b-0 flex items-center gap-3 ${
                          result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {result.status === 'success' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{result.userIdentifier}</div>
                            {result.error && (
                              <div className="text-sm text-red-600">{result.error}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramManager;