import React, { Component } from 'react';
import { Button, message, Steps } from 'antd';
import { observer, inject } from 'mobx-react';

import './index.less';
import InputPwd from 'components/Mnemonic/InputPwd';
import ShowPhrase from 'components/Mnemonic/ShowPhrase';
import ConfirmPhrase from 'components/Mnemonic/ConfirmPhrase';

import { checkCryptographic, checkPhrase } from 'utils/support';

const Step = Steps.Step;

@inject(stores => ({
  pwd: stores.mnemonic.pwd,
  method: stores.mnemonic.method,
  current: stores.mnemonic.current,
  mnemonic: stores.mnemonic.mnemonic,
  isSamePwd: stores.mnemonic.isSamePwd,
  setIndex: index => stores.mnemonic.setIndex(index),
  setMnemonic: val => stores.mnemonic.setMnemonic(val),
  setMnemonicStatus: ret => stores.session.setMnemonicStatus(ret)
}))

@observer
class Register extends Component {
  state = {
    steps: [{
      title: 'Create Phrase',
      content: <InputPwd />,
    }, {
      title: 'Secret Backup Phrase',
      content: <ShowPhrase />,
    }, {
      title: 'Confirm your Secret Backup Phrase',
      content: <ConfirmPhrase />,
    }]
  }

  next = () => {
    const { current, isSamePwd, setIndex, pwd, method, mnemonic } = this.props;
    if(current === 0) {
      if(isSamePwd) {
        if(checkCryptographic(pwd)) {
          if(method === 'create') {
            wand.request('phrase_generate', {pwd: pwd}, (err, val) => {
              if(err) {
                message.error('Create Phrase Failed');
                return;
              }
              this.props.setMnemonic(val);
              setIndex(1);
            });
          } else {
            setIndex(1);            
          }
        } else {
          message.error('Passwords must contain at least 6 characters of uppercase, lowercase, and numeric characters');
        }
      } else {
        message.error('Incorrect password setting');
      }
    } else if(current === 1 && method === 'import') {
      if(checkPhrase(mnemonic)) {
        setIndex( current + 1 );
      } else {
        message.error('Incorrect mnemonic import');
      }
    } else {
      setIndex( current + 1 );   
    }
  }

  prev = () => {
    const { setIndex, current } = this.props;
    console.log(current,'current')
    setIndex(current - 1);
  }

  done = () => {
    
    message.success('Processing complete!');
    this.props.setMnemonicStatus(true);
  }

  render() {
    const { steps } = this.state;
    const { current } = this.props;

    return (
      <div className="content">
        <Steps current={current}>
          {steps.map(item => <Step key={item.title} title={item.title} />)}
        </Steps>
        <div className="steps-content">{steps[current].content}</div>
        <div className="steps-action">
          {
            current < steps.length - 1
            && <Button type="primary" onClick={this.next}>Next</Button>
          }
          {
            current === steps.length - 1
            && <Button type="primary" onClick={this.done}>Done</Button>
          }
          {
            current > 1 && (<Button style={{ marginLeft: 8 }} onClick={this.prev}>Previous</Button>)
          }
        </div>
      </div>
    );
  }
}

export default Register;